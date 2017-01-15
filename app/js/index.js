/**
 * app/js/index.js - rmadmin
 */

~ function (app) {
  'use strict'

  const html = document.documentElement
      , fs = require('fs')
      , csv = require('csv-stream')
      , moment = require('moment')
      , { Client } = require('ssh2')
      , strip = require('strip-ansi')
      , debounce = require('debounce')

  app.controller('App', ['$scope', function ($scope) {
    $scope.state = 'devices'

    $scope.devices      = require('./js/state').devices
    $scope.deviceGroups = require('./js/state').deviceGroups
    $scope.operations   = require('./js/state').operations
    $scope.scripts      = require('./js/state').scripts

    $scope.$watch(debounce(_ =>
      fs.writeFile(`${__dirname}/js/state.json`, JSON.stringify({
        devices: $scope.devices,
        deviceGroups: $scope.deviceGroups,
        scripts: $scope.scripts,
        operations: $scope.operations
      }), _=>0)
    , 1000))

    /**
     * Helpers.
     */
    // operations => operation
    $scope.singular = word => word.substr(0, word.length - 1)

    // get color for group
    $scope.groupColors = [
      'primary',
      'info',
      'success',
      'warning',
      'danger'
    ]
    $scope.groupColor = group => $scope.groupColors[$scope.deviceGroups.indexOf(group) % $scope.groupColors.length]

    $scope.statusColor = {
      'Successful': 'success',
      'Failed': 'danger',
      'Not run': 'default',
      'Running': 'info',
      'Partial': 'warning'
    }

    var whichScript = script => {
      for (let i = 0; i < $scope.scripts.length; ++ i) {
        if (script === $scope.scripts[i].name) {
          return i
        }
      }

      return -1
    }

    $scope.opTime = op => moment(op.timestamp).fromNow()

    /**
     * Search for existing items.
     */

    var itemSearchProperty = {
      'devices': 'host'
    , 'scripts': 'name'
    }

    $scope.hostSearch = ''
    $scope.results = () => $scope[$scope.state].filter(item => {
      try {
        var pttn = new RegExp($scope.hostSearch, 'gi')

        if ($scope.state === 'devices') {
          return pttn.test(item.host) || pttn.test(item.group)
        }

        if ($scope.state === 'operations') {
          return pttn.test(item.script) || pttn.test(item.group)
        }        

        return pttn.test(item.name)
      } catch (err) {
        return false
      }
    })

    /**
     * New item defaults.
     */

    $scope.newName = {
      'devices': 'Host'
    , 'scripts': 'Script name'
    , 'operations': 'Operation name'
    }

    $scope.newPlaceholder = {
      'devices': 'IP address or hostname of your host'
    , 'scripts': 'A catchy name that describes the task of the script.'
    , 'operations': 'Descriptor of what the operation is going to do.'
    }

    $scope.createNew = () => {
      if ($scope.state === 'devices') {
        let device = {
          host: 'example.com',
          group: '',
          username: 'root',
          password: '',
          port: 22
        }

        $scope.devices.push(device)
        $scope.edit(device)
      } else if ($scope.state === 'scripts') {
        // create new script
        let script = {
          name: 'Default script',
          body: 'echo "Hello, world"\nexit'
        }

        // save & edit
        $scope.scripts.push(script)
        $scope.edit(script)
      } else if ($scope.state === 'operations') {
        let op = {
          group: '',
          script: '',
          status: 'Not run',
          timestamp: null,
          results: {}
        }

        // save & edit
        $scope.operations.push(op)
        $scope.edit(op)
      }
    }

    $scope.testingAuth = false
    $scope.authProgess = 0
    $scope.testResults = {}

    $scope.testAuth = () => {
      $scope.testingAuth = true
      $scope.authProgess = 20
      $scope.testResults = {
        type: '',
        status: '',
        message: ''
      }

      setTimeout(() => {
        var conn = new Client()

        conn.on('ready', () => {
          $scope.testResults.type = 'success'
          $scope.testResults.status = 'Success'
          $scope.testResults.message = 'Connection was successful.'

          conn.end()

          $scope.testingAuth = false
          $scope.$apply()
        })

        conn.on('close', hadError => {
          if (hadError) {
            $scope.testResults.type = 'danger'
            $scope.testResults.status = 'Error'
            $scope.testResults.message = $scope.testResults.message || 'Something went wrong.'
          }

          $scope.testingAuth = false
          $scope.$apply()
        })

        conn.on('error', err => {
          $scope.testResults.type = 'danger'
          $scope.testResults.status = 'Error'
          $scope.testResults.message = err.message || String(err)

          $scope.testingAuth = false
          $scope.$apply()
        })

        // try connect
        try {
          conn.connect({
            host: $scope.editItemName
          , port: $scope.port
          , username: $scope.username
          , password: $scope.password
          })
        } catch (err) {
          $scope.testResults.type = 'danger'
          $scope.testResults.status = 'Error'
          $scope.testResults.message = err.message || String(err)

          $scope.testingAuth = false
          $scope.$apply()
        }
      }, 0)
    }

    /**
     * Existing item edit.
     */
    $scope.editable = {}
    $scope.supportedLangs = require('./js/langs')
    $scope.scriptLang = 'sh'

    $scope.resetEdit = () => {
      $scope.editDeviceGroup =
         $scope.editItemName = 
        $scope.editGroupName =
         $scope.editOpScript =
          $scope.editOpGroup = ''

      $scope.opProgress = 0
      $scope.editOpState = 'edit'

      $scope.testingAuth = false
      $scope.authProgess = 0
      $scope.testResults = {}
    }

    $scope.edit = item => {
      $scope.resetEdit()

      $scope.editable = item
      $scope.editItemName = item[itemSearchProperty[$scope.state]]

      if ($scope.state === 'devices') {
        $scope.editDeviceGroup = String($scope.deviceGroups.indexOf(item.group))

        $scope.port = item.port
        $scope.username = item.username
        $scope.password = item.password
      } else if ($scope.state === 'scripts') {
        document.getElementById('editor-container').innerHTML = `<div id="editor" style="height: ${window.innerHeight * .5}px; ">${item.body}</div>`

        $scope.editor = ace.edit('editor')
        $scope.editor.setTheme('ace/theme/monokai')
        $scope.editor.getSession().setMode('ace/mode/' + $scope.scriptLang)
      } else {
        $scope.editOpScript = String(whichScript($scope.editable.script))
        $scope.editOpGroup = String($scope.deviceGroups.indexOf($scope.editable.group))
      }

      $('#editModal').modal('show')
    }

    $scope.updateLang = () => $scope.editor.getSession().setMode('ace/mode/' + $scope.scriptLang)

    $scope.save = () => {
      $scope.editable[itemSearchProperty[$scope.state]] = $scope.editItemName

      if ($scope.state === 'devices') {
        let group = $scope.editDeviceGroup

        // create new group, if need be
        if (group === '-1') {
          group = $scope.deviceGroups.push($scope.editGroupName) - 1
        }

        // update group
        $scope.editable.group = $scope.deviceGroups[+group]

        // update auth
        $scope.editable.port = $scope.port
        $scope.editable.username = $scope.username
        $scope.editable.password = $scope.password
      } else if ($scope.state === 'scripts') {
        $scope.editable.body = $scope.editor.getValue()
      } else {
        $scope.editable.script = $scope.scripts[+$scope.editOpScript].name
        $scope.editable.group = $scope.deviceGroups[+$scope.editOpGroup]
      }

      $scope.resetEdit()
    }

    $scope.editOpState = 'edit'

    $scope.runOp = () => {
      // grab the operation object
      let op = $scope.editable

      // let save parse the properties
      $scope.save()

      // if it has already been run, we need
      // to duplicate it
      if (op.status !== 'Not run') {
        op = JSON.parse(JSON.stringify(op))

        // resets for new object
        op.status = 'Not run'
        op.timestamp = null
        op.results = {}

        // add it to the list
        $scope.operations.push(op)
      }

      $scope.editOpState = 'loading'

      // verify that user is ready
      if (confirm(`Are you sure you are ready to run this operation?\n\nIt will execute the script "${op.script}" across the ${op.group} group (${$scope.devices.filter(d => d.group === op.group).length} devices).`)) {
        op.status = 'Running'
        $scope.editOpStatus = ''
        $scope.opProgress = 50

        let script = $scope.scripts[ whichScript(op.script) ].body

        Promise.all(
          $scope.devices.filter(device => {
            return device.group === op.group
          }).map(device => new Promise((resolve, _) => {
            let conn = new Client(), resolved = false,
                output = ''

            conn.on('ready', () => {
              conn.shell((err, stream) => {
                if (err) {
                  resolved = true
                  resolve({
                    host: device.host,
                    status: 'Failed',
                    message: String(err)
                  })
                } else {
                  stream.on('close', () => {
                    resolved = true
                    resolve({
                      host: device.host
                    , status: 'Successful'
                    , message: strip(output)
                    })

                    conn.end()
                  }).on('data', d =>
                      output += d.toString('utf8')
                    )
                    .stderr.on('data', d =>
                      output += d.toString('utf8')
                    )

                  stream.end(script + '\n\n')
                }
              })
            })

            conn.on('close', hadError => {
              if (!resolved) {
                resolve({
                  host: device.host,
                  status: hadError ? 'Failed' : 'Successful',
                  message: hadError ? 'Something went wrong.' : ''
                })
              }
            })

            conn.on('error', err => {
              resolved = true
              resolve({
                host: device.host,
                status: 'Failed',
                message: String(err)
              })
            })

            try {
              conn.connect({
                host: device.host
              , port: device.port
              , username: device.username
              , password: device.password
              })
            } catch (err) {
              resolve({
                host: device.host,
                status: 'Failed',
                message: String(err)
              })
            }
          }))
        ).then((states) => {
          let failed = 0
          for (let i = 0; i < states.length; ++ i) {
            if (states[i].status !== 'Successful') {
              failed += 1
            }

            op.results[states[i].host] = {
              status: states[i].status
            , message: states[i].message
            }
          }

          if (failed === 0) op.status = 'Successful'
          else if (failed === states.length) op.status = 'Failed'
          else op.status = 'Partial'

          op.timestamp = Date.now()
          $scope.opProgress = 100
          $scope.editOpState = 'results'
          $scope.$apply()
        })
      }
    }

    $scope.viewResults = () => {
      $scope.editOpState = 'results'
    }

    /**
     * Batch editing.
     */
    $scope.batchSave = () => {
      if ($scope.state === 'devices') {
        let group = $scope.batchDeviceGroup

        // update group
        if (group) {
          // create new group, if need be
          if (group === '-1') {
            group = $scope.deviceGroups.push($scope.batchGroupName) - 1
          }

          // update all results
          $scope.results().forEach(device => {
            device.group = $scope.deviceGroups[+group]
          })
        }

        // update other details
        $scope.results().forEach(device => {
          if ($scope.batchPort) device.port = $scope.batchPort;
          if ($scope.batchUsername) device.username = $scope.batchUsername;
          if ($scope.batchPassword) device.password = $scope.batchPassword;
        })
      }

      $scope.batchDeviceGroup =
        $scope.batchGroupName = ''
    }

    $scope.batchDelete = () => {
      let results = $scope.results()

      if (confirm('Are you sure you want to delete all the matching devices?\n\nThis operation will delete ' + results.length + ' hosts.')) {
        $scope.devices = $scope.devices.filter(d => {
          return !((new RegExp($scope.hostSearch, 'gi').test(String(d.host))) && results.indexOf(d) !== -1)
        })

        $scope.hostSearch = ''

        $('#batchEdit').modal('hide')
      }
    }

    /**
     * CSV loading stuff.
     */
    $scope.resetCSV = () => {
      $scope.csvState = 0
      $scope.csvHasHeaders = true
      $scope.csvLoading = false
      $scope.csvProgress = 0

      $scope.csvHeaders =
      $scope.csvFile =
      $scope.csvHostCol = 
      $scope.csvGroupCol = 
      $scope.csvPortCol = 
      $scope.csvUserCol = 
      $scope.csvPassCol =
      document.getElementById('csvFile').value = ''
    }

    $scope.loadCSV = () => {
      let file = document.getElementById('csvFile')

      if ($scope.csvState === 0 && (!('files' in file) || file.files.length !== 1)) {
        console.error('Wrong number of files.')
      }

      $scope.csvStatus = ''
      $scope.csvProgress = 0
      $scope.csvLoading = true

      setTimeout(() => {
        // step #1: load the headers
        if ($scope.csvState === 0) {
          if ($scope.csvHasHeaders) {
            $scope.csvStatus = 'Looking for headers'
            $scope.csvProgress = 40

            var data = '', stream

            (stream = fs.createReadStream($scope.csvFile = file.files[0].path, {
              encoding: 'utf-8'
            })).on('data', d => {
              data += d

              let index = data.indexOf('\n')

              if (index !== -1) {
                data = data.substr(0, index + 1)
                stream.close()

                // use csv-stream parser to infer headers
                let str = csv.createStream({
                  escapeChar: '"', enclosedChar: '"'
                })

                str.on('data', d => {
                  $scope.csvState += 1
                  $scope.csvHeaders = Object.keys(d).join(', ')
                  $scope.csvLoading = false

                  $scope.$apply()
                })

                // double up on the data to trigger 'data' event
                str.write(new Buffer(data + data, 'utf-8'))
                str.end()
              }
            })
          } else {
            $scope.csvState += 1
            $scope.csvLoading = false

            $scope.$apply()
          }
        }

        // step #2: confirm the headers, do import
        else if ($scope.csvState === 1) {
          $scope.csvStatus = 'Importing devices ...'
          $scope.csvHeaders = $scope.csvHeaders.split(',').map(s => s.trim())

          let { size } = fs.statSync($scope.csvFile),
              completed = 0,
              stream = fs.createReadStream($scope.csvFile, {
                encoding: 'utf-8'
              }),
              csvStream = csv.createStream({
                columns: $scope.csvHasHeaders ? null : $scope.csvHeaders
              }),
              importedGroups = []

          stream.on('data', d => {
            completed += d.length
            $scope.csvProgress = (completed / size) * 100
            $scope.$apply()

            csvStream.write(new Buffer(d, 'utf-8'))
          })

          stream.on('end', csvStream.end.bind(csvStream))

          csvStream.on('data', d => {
            importedGroups.push(d[$scope.csvGroupCol])

            $scope.devices.push({
              host: d[$scope.csvHostCol]
            , group: d[$scope.csvGroupCol]
            , port: d[$scope.csvPortCol]
            , username: d[$scope.csvUserCol]
            , password: d[$scope.csvPassCol]
            })
          })

          csvStream.on('end', () => {
            // add unknown unique groups
            importedGroups.forEach((e, i, s) => {
              e = (e || '').trim()

              if (e && s.indexOf(e) === i && $scope.deviceGroups.indexOf(e) === -1) {
                $scope.deviceGroups.push(e)
              }
            })

            // update state
            $scope.$apply($scope.resetCSV)
            $('#csvModal').modal('hide')
          })
        }
      }, 0)
    }

    window.$scope=$scope
  }])
}(angular.module('rmadmin', ['ngAnimate']))