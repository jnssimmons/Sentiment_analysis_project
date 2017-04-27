'use strict'

// Set up parameters for search
const mincount = 2 // Minimum number of mentions within text to be considered relevant.

// Set up twitter and app credentials (See dev.twitter.com)
const Twit = require('twit');
const T = new Twit({
    consumer_key: process.env.twitterconsumerkey,
    consumer_secret: process.env.twitterconsumersecret,
    access_token: process.env.twitteraccesstoken,
    access_token_secret: process.env.twitteraccestokensecret
});

// Set up Cognitive Services credentials
const topicskey = 'bfa445e8654443219af90c643f47a714';
const sentimentkey = '';

// Accept user input
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
var twitterhandle, tweetcount;
rl.question("Enter influencer's twitter user ID ", (id) => {
    twitterhandle = id;
    rl.question("Enter number of tweets to analyze ", (number) => {
        tweetcount = number;
        console.log(`WORKING // Sending request to grab the last ${tweetcount} tweets from user ${twitterhandle}...`);

        // Get twitter data
        var documents = [];
        T.get('statuses/user_timeline', { screen_name: twitterhandle, count: tweetcount }, function(err, data, response) {
            for (let i=0; i<tweetcount; i++) { 
                documents.push({
                    id: i+1,
                    text: data[i].text
                });
            }  
            console.log(`SUCCESS // Tweets collected. Please wait...`);

            // Send tweets for topic analysis
            const requestObj = require('request');
            requestObj({
                url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/topics",
                headers: { "Content-Type": "application/json", "Ocp-Apim-Subscription-Key": topicskey },
                method: "POST",
                body: JSON.stringify({"documents": documents})
            }, function(err, res, body){
                if (err) { console.log(`ERROR`) }
                let topicendpoint = res.headers.location;
                console.log(`WORKING // Sending tweets to Cognitive Services topic analysis API...`);
                
                // Check for results every 30 seconds.
                let endpointCycle = setInterval(callTopicEndpoint, 30000);
                
                // Retrieve topics and scores
                function callTopicEndpoint(){
                    requestObj({
                        url: topicendpoint,
                        headers: { "Ocp-Apim-Subscription-Key": topicskey },
                        method: "GET",
                    }, function(err, res, body){
                        let result = JSON.parse(body);
                        if (result.status == "Succeeded"){
                            console.log(`SUCCESS // Topic analysis complete! Results:`);
                            for ( let i=0; i<result.operationProcessingResult.topics.length; i++){
                                    if (result.operationProcessingResult.topics[i].score >= mincount) {
                                        console.log(`${twitterhandle} mentioned "${result.operationProcessingResult.topics[i].keyPhrase}" ${result.operationProcessingResult.topics[i].score} times.`);
                                    }
                            }
                            clearInterval(endpointCycle);
                        }
                        else if (result.status == "Running"){ 
                            console.log(`WORKING // Crunching the numbers. This could take several minutes...`)
                            console.log(result.status)
                        }
                        else { 
                            console.log(`Something went wrong. :(`);
                            console.log(result.status);
                        }
                    });
                }
            })
        });
    rl.close();
    });
});