var rally = require('rally'),
    Bluebird = require('bluebird'),
    queryUtils = rally.util.query,
    config = require('./config'),
    _ = require('lodash'),
    GitHubApi = require("github"),
    moment = require('moment'),
    fs = require('fs'),
    json2csv = require('json2csv'),
    CL = console.log;

var github = new GitHubApi({
    version: '3.0.0',
    protocol: 'https',
    host: 'api.github.com',
    timeout: 5000
});

github.authenticate({
    type: "token",
    token: config.git.accessToken
});

function getPulls (repoName) {
    return new Bluebird.Promise(function(resolve, reject) {
        github.pullRequests.getAll({
            user:'Rhapsody',
            repo: repoName,
            sort: 'updated',
            direction: 'desc',
            state: 'all',
            per_page: config.git.per_page
        }, function (err, pulls) {
            if (err) {
                reject(err);
            }
            CL('PRs for ' + repoName + ' fetched');
            addPulls(repoName, pulls, resolve);
        });
    });
};

function addPulls(repoName, pulls, resolve, reject) {
    var pullsToCsv = [];
    var me = config.git.username;

    _.each(pulls, function (pull) {
        if (!pull.assignee) {
            pull.assignee = { login: 'Not Assigned' };
        };
        pull.lastUpdate = moment(pull.updated_at).format('MMMM Do');
        pull.createdAt = moment(pull.created_at).format('MMMM Do');
        if (config.git.show_all) {
            pullsToCsv.push(pull);
        } else { // Only add PR's that I'm assigned or created
            if (pull.assignee.login === me ||
                pull.user.login === me) {
                pullsToCsv.push(pull);
            }
        }
    });

    json2csv({ data: pullsToCsv, fields: ['title', 'user.login', 'assignee.login', 'lastUpdate', 'createdAt'] }, function(err, csv) {
      if (err) {reject(err)};

      fs.appendFile(config.csvFileName, repoName + '\n', function(err) {
          if (err) {reject(err)};
          fs.appendFile(config.csvFileName, csv + '\n', function(err) {
              if (err) {reject(err)};
            });
        });
    });

    resolve();
};

restApi = rally({
    apiVersion: 'v2.0', //this is the default and may be omitted
    server: 'https://rally1.rallydev.com/',
    apiKey: config.rally.apiKey
});

function getQuery(options) {
    return !options.dateRange ?
        queryUtils.where('Owner', '=', options.email) :
        queryUtils.where('Owner', '=', options.email)
            .and('LastUpdateDate', '>=', options.dateRange);
};

function queryEpicStories(options) {
    return new Bluebird.Promise(function (resolve, reject) {
        restApi.query({
            type: options.type,
            start: 1,
            pageSize: Infinity,
            limit: Infinity,
            key : options.type,
            order: 'Rank',
            fetch: ['FormattedID', 'Name', 'ScheduleState', 'Children', 'Details', 'RevisionHistory', 'LastUpdateDate', 'PlanEstimate', 'TIMETRACKING'],
            query: getQuery(options)
        }, function(error, result) {
            if (error) {
                reject(error);
            } else {
                CL(options.type + ' fetched');
                addStories(options.type, result.Results, resolve);
            }
        });
    })
};

function addStories(storyType, stories, resolve, reject) {
    _.each(stories, function (story) {
        story.lastUpdate = moment(story.LastUpdateDate).format('MMMM Do');
    });

    json2csv({ data: stories, fields: ['FormattedID','Name', 'PlanEstimate', 'lastUpdate', 'c_Timetracking'] }, function(err, csv) {
      if (err) {reject(err)};

      var storyRowName = storyType === 'defects' ? "Defects" : "User Stories";

      fs.appendFile(config.csvFileName, storyRowName + '\n', function(err) {
          if (err) {reject(err)};
          fs.appendFile(config.csvFileName, csv + '\n', function(err) {
              if (err) {reject(err)};
            });
        });
    });

    resolve();
};

// Look for CSV and delete it if it exists
function deleteCSV () {
    return new Bluebird.Promise(function (resolve, reject) {
        fs.exists(config.csvFileName, function (exists) {
            if (exists) {
                fs.unlink(config.csvFileName, function(err){

                   if (err) { reject(err) };
                   CL(config.csvFileName + " deleted");
                });
            }
            resolve();
        });
    });
};


// Get user stories and defects from rally
var hierarchy = _.assign({}, config.rally, {type: 'hierarchicalrequirement'});
var defects = _.assign({}, config.rally, {type: 'defects'});
deleteCSV().then(function() {
    queryEpicStories(hierarchy);
}).then(function () {
    queryEpicStories(defects);
}).then(function () {
    getPulls('api-gateway');
}).then(function () {
    getPulls('developer.rhapsody.com')})
.then(function () {
    CL('All data fetched and CSV written');
})
.catch(function (err) {
   CL(err);
});
