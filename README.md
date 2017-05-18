Ticket Getter - Take the "time" out of Timetracking
===========

This script gets a list of PR's from github and cards from rally for the NAPI team. It then puts relevant info into a csv file. WARNING: the script deletes the csv and overwrites it. If you cant to keep the data you pull, either change the file name or modify the script.

### Install
*Note: You need node.js for this bad boy.*

 - npm install

 ### Config set up

 Fill out the config file with your access token from [github](https://github.com/settings/tokens/new) and [rally](https://rally1.rallydev.com/login/accounts/index.html#/keys).

 ### Run
 - node index.js