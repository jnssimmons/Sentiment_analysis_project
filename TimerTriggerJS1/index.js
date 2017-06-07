module.exports = function (context, myTimer) {
    var timeStamp = new Date().toISOString();
    
    if(myTimer.isPastDue)
    {
        context.log('JavaScript is running late!');
    }

    context.log('JavaScript timer trigger function ran!', timeStamp);   
    

'use strict'

// Set up parameters for search & array for data storage
const mincount = 2 // Minimum number of mentions within text to be considered relevant.
const toptopic = 3; //Number of topics to send to Azure table storage based on top scores
var documents = [];
var topics = [];

//Set up Azure Storage credentials
var azure = require('azure-storage')
var tableSvc = azure.createTableService(process.env.azurestoragename, process.env.azurestoragekey)

// Set up twitter and app credentials (See dev.twitter.com)
const Twit = require('twit');
const T = new Twit({
    consumer_key: process.env.twitterconsumerkey,
    consumer_secret: process.env.twitterconsumersecret,
    access_token: process.env.twitteraccesstoken,
    access_token_secret: process.env.twitteraccesstokensecret
});

// Set up Cognitive Services credentials
const textkey = process.env.textkey;

//Set up request node module
const requestObj = require('request');

// Test statements for skipping input
var twitterhandle = "Azure", tweetcount = '100';
pullTweets(twitterhandle, tweetcount, '', topicAnalysis);

function pullTweets(twitterhandle, tweetcount, query = '', callback) {
    let tweets = [];
    if (query.length > 0) {
        for (var i = 0; i < documents.length; i++) {
            if (documents[i].text.includes(query)) {
                tweets.push({
                    id: query + (i + 1),
                    text: documents[i].text,
                    language: 'en'
                });
            }
        }

        callback(query, tweets)
    }
    else {
        T.get('statuses/user_timeline', { screen_name: twitterhandle, count: tweetcount }, function (err, data, response) {
            console.log(data);
            for (let i = 0; i < tweetcount; i++) {
                documents.push({
                    id: query + (i + 1),
                    text: data[i].text,
                    language: 'en'
                });
            }

            context.log(`SUCCESS // Tweets collected. Please wait...`);
            callback()
        })
    }
};

// Topic analysis done on tweets collected

function topicAnalysis() {

    requestObj({
        url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/topics",
        headers: { "Content-Type": "application/json", "Ocp-Apim-Subscription-Key": textkey },
        method: "POST",
        body: JSON.stringify({ "documents": documents })
    }, function (err, res, body) {
        if (err) { console.log(`ERROR`) }
        let topicendpoint = res.headers.location;
        context.log(`WORKING // Sending tweets to Cognitive Services topic analysis API...`);

        // Check for results every 30 seconds.
        let endpointCycle = setInterval(callTopicEndpoint, 30000);

        // Retrieve topics and scores
        function callTopicEndpoint() {
            requestObj({
                url: topicendpoint,
                headers: { "Ocp-Apim-Subscription-Key": textkey },
                method: "GET",
            }, function (err, res, body) {
                let result = JSON.parse(body);

                if (result.status == "Succeeded") {
                    context.log(`SUCCESS // Topic analysis complete! Results:`);
                    for (let i = 0; i < result.operationProcessingResult.topics.length; i++) {
                        if (result.operationProcessingResult.topics[i].score >= mincount) {
                            context.log(`${twitterhandle} mentioned "${result.operationProcessingResult.topics[i].keyPhrase}" ${result.operationProcessingResult.topics[i].score} times.`);
                            topics.push({
                                topic: result.operationProcessingResult.topics[i].keyPhrase,
                                score: parseInt(result.operationProcessingResult.topics[i].score)
                            });
                        }
                    }

                    topics.sort(function (a, b) {
                        return b.score - a.score;
                    })

                    // for top 3 topics, run sentiment analysis ; if you want more than top 3 change value of toptopic value
                    for (let i = 0; i < toptopic; i++) {
                        pullTweets(twitterhandle, tweetcount, topics[i].topic, sentAnalysis)
                    }

                    clearInterval(endpointCycle);

                }
                else if (result.status == "Running") {
                    context.log(`WORKING // Crunching the numbers. This could take several minutes...`)

                }
                else {
                    context.log(body)
                    context.log(`Something went wrong. :(`);
                    clearInterval(endpointCycle);
                }
            });
        }
    })

}

// Sentiment Analysis done on tweets only relating to topics

function sentAnalysis(topic, tweets) {

    requestObj.post({
        url: 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment',
        body: JSON.stringify({ "documents": tweets }),
        headers: {
            'Ocp-Apim-Subscription-Key': textkey,
            'Content-Type': 'application/json',
        }
    }, function (err, resp, body) {
        let result = JSON.parse(body);
        var total = 0, data = [];

        for (let i = 0; i < result.documents.length; i++) {
            if (result.documents[i].id.includes(topic)) {
                total += result.documents[i].score;
                data.push(parseFloat(result.documents[i].score));
            }
        }

        data.sort(function (a, b) {
            return a - b;
        })

        let min = data[0];
        let max = data[data.length - 1];
        let avg = total / data.length;

        var entGen = azure.TableUtilities.entityGenerator
        var task = {
            PartitionKey: entGen.String(twitterhandle),
            RowKey: entGen.String(new Date(Date.now()).toString()), // must be unique
            TwitterId: entGen.String('  '),
            MinSentiment: entGen.Double(min),
            MaxSentiment: entGen.Double(max),
            AvgSentiment: entGen.Double(avg),
            SubTopic: entGen.String(topic)
        }

        // Table name defaults to 'Technology' but could be dynamically generated as well
        tableSvc.insertEntity('Technology', task, function (error, result, response) {
            if (!error) {
                context.log('Analysis Data added to Table')
            } else {
                context.log(error)
            }
        })

        

        context.log(topic + " data ");
        context.log('Min ' + min + ' Max ' + max + ' Avg ' + avg);
    })
}
    context.done();
};

