var restify = require('restify');
var builder = require('botbuilder');
var blockchain = require('blockchain.info');
var exchange = require('blockchain.info/exchange');
var Promise = require('promise');
var cognitiveServices = require('botbuilder-cognitiveservices');



// Setup Restify Server

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector);

var qnaMakerRecogniser = new cognitiveServices.QnAMakerRecognizer({
    knowledgeBaseId:'97763c34-65da-40f4-9fa3-9a934848e02a',
    subscriptionKey:'97d7c8e2b5c94ce295787da257790c86',
    top: 4
});

var luisEndpoint = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/83e916ab-5ee4-4507-95d6-21b15ef29211?subscription-key=0898a72fbc3341dfb5220cae1a6b77b9&verbose=true&timezoneOffset=60';
var luisRecognizer = new builder.LuisRecognizer(luisEndpoint);

var intents = new builder.IntentDialog({ recognizers: [qnaMakerRecogniser, luisRecognizer] });
bot.dialog('/', intents);

intents.matches('Blockchain.RecieveBitcoin', builder.DialogAction.send('You want to recieve btc'));
intents.matches('Blockchain.SendBitcoin', builder.DialogAction.send('You want to send btc'));

intents.matches('qna', [
    function (session, args, next) {
        var answerEntity = builder.EntityRecognizer.findEntity(args.entities, 'answer');
        session.send(answerEntity.entity);
    }
]);

intents.onDefault([
    function(session){
        var res = exchange.getTicker(null);
        res.then(function(value) {
            session.send('Sorry!! No match!! \n Here somme exchange info :'+JSON.stringify(value));
        });

    }
]);

