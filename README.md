# rmadmin

Remotely administer groups of machines over SSH.

## Setup

Clone the repo somewhere (or download as a zip) and run `npm i`
in the folder (you must have `node >= 6.9.4` installed).

## Usage

There's three main tabs: Devices, Scripts, & Operations.

Under **Devices**, create a few devices that you are interested
in administering. If you have lots of devices stored in some
CSV, you can load the whole CSV together.

Ensure that all device have their ports and authentication
configured properly. When adding individual devices, you can
test the connection using the 'Test' button.

Under **Scripts**, create a new script that will do your administration.
This script will be run using whatever the default shell is on
the machine - so make sure you don't assume that your favourite
shell is available.

***PLEASE ENSURE THAT YOU EXIT YOUR SCRIPT PROPERLY. IN MOST SHELLS, THIS
IS DONE BY RUNNING 'exit' BUT IN SOME THIS IS DONE WITH 'quit' OR SOME
OTHER PROPRIETARY COMMAND. IF YOU DO NOT EXIT, THE PROGRAM WILL HANG. THERE
IS NO TIMEOUT SETTING YET.***

Under *Operations*, create a new operation that connects a script
with a group. Click `Run` and confirm that you are ready to run (given
that the number of devices found in the group is what you were expecting).
You can then view and search results using the 'View Results' tab in the
operation pop-up.

## License

All code is licensed to the public (under [WTFPL](http://www.wtfpl.net/)).
