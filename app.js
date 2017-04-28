'use strict'

// Set up parameters for search & array for data storage
const mincount = 2 // Minimum number of mentions within text to be considered relevant.
const toptopic = 3; //Number of topics to send to azure table storage based on top scores
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
    access_token_secret: process.env.twitteraccestokensecret
});

// Set up Cognitive Services credentials
const cognitivekey = process.env.cognitivekey;


//Set up additional nodemodules needed
const requestObj = require('request');

// Accept user input
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
var twitterhandle , tweetcount ;
rl.question("Enter influencer's twitter user ID ", (id) => {
    twitterhandle = id;
    rl.question("Enter number of tweets to analyze ", (number) => {
        tweetcount = number;
        console.log(`WORKING // Sending request to grab the last ${tweetcount} tweets from user ${twitterhandle}...`);

        // Get twitter data
        pullTweets(twitterhandle, tweetcount, '', topicAnalysis);


        // Send tweets for topic analysis
        // topicAnalysis();


        rl.close();
    });
});





function pullTweets(twitterhandle, tweetcount, query = '', callback) {
    if (query.length > 0) {
        T.get('statuses/user_timeline', { screen_name: twitterhandle, count: tweetcount, q: query }, function (err, data, response) {
            for (let i = 0; i < tweetcount; i++) {
                documents.push({
                    id: query + (i + 1),
                    text: data[i].text,
                    language: 'en'
                });
            }

            console.log(`SUCCESS // Tweets collected. Please wait...`);
            callback(query)
        })
    }
    else {
        T.get('statuses/user_timeline', { screen_name: twitterhandle, count: tweetcount }, function (err, data, response) {
            for (let i = 0; i < tweetcount; i++) {
                documents.push({
                    id: query + (i + 1),
                    text: data[i].text,
                    language: 'en'
                });
            }

            console.log(`SUCCESS // Tweets collected. Please wait...`);
            callback()
        })
    }
};

function topicAnalysis() {
    const requestObj = require('request');
    requestObj({
        url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/topics",
        headers: { "Content-Type": "application/json", "Ocp-Apim-Subscription-Key": cognitivekey },
        method: "POST",
        body: JSON.stringify({ "documents": documents })
    }, function (err, res, body) {
        if (err) { console.log(`ERROR`) }
        let topicendpoint = res.headers.location;
        console.log(`WORKING // Sending tweets to Cognitive Services topic analysis API...`);

        // Check for results every 30 seconds.
        let endpointCycle = setInterval(callTopicEndpoint, 30000);

        // Retrieve topics and scores
        function callTopicEndpoint() {
            requestObj({
                url: topicendpoint,
                headers: { "Ocp-Apim-Subscription-Key": cognitivekey },
                method: "GET",
            }, function (err, res, body) {
                let result = JSON.parse(body);

                if (result.status == "Succeeded") {
                    console.log(`SUCCESS // Topic analysis complete! Results:`);
                    documents = [];
                    for (let i = 0; i < result.operationProcessingResult.topics.length; i++) {
                        if (result.operationProcessingResult.topics[i].score >= mincount) {
                            console.log(`${twitterhandle} mentioned "${result.operationProcessingResult.topics[i].keyPhrase}" ${result.operationProcessingResult.topics[i].score} times.`);
                            topics.push({
                                topic: result.operationProcessingResult.topics[i].keyPhrase,
                                score: parseInt(result.operationProcessingResult.topics[i].score)
                            });
                        }
                    }

                    topics.sort(function (a, b) {
                        return b.score - a.score;
                    })

                    for (let i = 0; i < toptopic; i++) {
                        pullTweets(twitterhandle, tweetcount, topics[i].topic, sentAnalysis)
                    }

                    clearInterval(endpointCycle);

                }
                else if (result.status == "Running") {
                    console.log(`WORKING // Crunching the numbers. This could take several minutes...`)
                    
                }
                else {
                    console.log(`Something went wrong. :(`);
                    
                }
            });
        }
    })

}

function sentAnalysis(topic) {

    requestObj.post({
        url: 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment',
        body: JSON.stringify({ "documents": documents }),
        headers: {
            'Ocp-Apim-Subscription-Key': 'cognitivekey',
            'Content-Type': 'application/json',
        }
    }, function (err, resp, body) {
        let result = JSON.parse(body);
        var total = 0, data = [];

        for (let i = 0; i < result.documents.length; i++) {
            total += result.documents[i].score;
            data.push(parseFloat(result.documents[i].score));
        }

        data.sort(function (a, b) {
            return a - b;
        })

        let min = data[0];
        let max = data[data.length - 1];
        let avg = total / data.length;

        console.log(topic + " data ");
        console.log('Min ' + min + ' Max ' + max + ' Avg ' + avg);
    })
}