'use strict'

// Set up parameters for search & array for data storage
const mincount = 2 // Minimum number of mentions within text to be considered relevant.
const toptopic = 3; //Number of topics to send to azure table storage based on top scores
var documents = [];
var topics = [];

// Set up twitter and app credentials (See dev.twitter.com)
const Twit = require('twit');
const T = new Twit({
    consumer_key: process.env.twitterconsumerkey,
    consumer_secret: process.env.twitterconsumersecret,
    access_token: process.env.twitteraccesstoken,
    access_token_secret: process.env.twitteraccesstokensecret
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
var twitterhandle = "ItsFlo" , tweetcount = '100' ;
/* rl.question("Enter influencer's twitter user ID ", (id) => {
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
*/

pullTweets(twitterhandle,  tweetcount, '', topicAnalysis);

//pullTweets(twitterhandle,  tweetcount, '#HappyMothersDay', sentAnalysis);


function pullTweets(twitterhandle, tweetcount, query = '', callback) {
    let tweets = [];
    if (query.length > 0) {
        T.get('search/tweets', { q: query + ' from:' +  twitterhandle, count: tweetcount}, function (err, data, response) {
            for (let i = 0; i < data.length; i++) {
               // console.log(data);
                tweets.push({
                    id: query + (i + 1),
                    text: data.statuses[i].text,
                    language: 'en'
                });
            console.log(`SUCCESS // Tweets collected. Please wait...`);
            callback(query, tweets)
        }
    })}
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

            console.log(`SUCCESS // Tweets collected. Please wait...`);
            callback()
        })
    }
};
