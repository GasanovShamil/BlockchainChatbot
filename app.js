var restify = require('restify');
var builder = require('botbuilder');
var blockchain = require('blockchain.info');
var exchange = require('blockchain.info/exchange');
var MyWallet = require('blockchain.info/MyWallet');
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

// var qnaMakerRecogniser = new cognitiveServices.QnAMakerRecognizer({
//     knowledgeBaseId:'97763c34-65da-40f4-9fa3-9a934848e02a',
//     subscriptionKey:'97d7c8e2b5c94ce295787da257790c86',
//     top: 4
// });

var luisEndpoint = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/83e916ab-5ee4-4507-95d6-21b15ef29211?subscription-key=0898a72fbc3341dfb5220cae1a6b77b9&verbose=true&timezoneOffset=60';
var luisRecognizer = new builder.LuisRecognizer(luisEndpoint);

var options = { apiCode: 'df60d92b-6b4f-4132-8aae-b982349304f8', apiHost: 'http://vps456622.ovh.net:3031/' };

bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.send(new builder.Message().address(message.address).text('Hello ! I am your blockchain assistant !'));
            }
        });
    }
});

bot.recognizer(luisRecognizer);

// var intents = new builder.IntentDialog({ recognizers: [qnaMakerRecogniser, luisRecognizer] });
// bot.dialog('/', intents);

// region Intents
// intents.matches('Blockchain.CheckWallet', [
//     function(session){
//         session.beginDialog('CheckWallet');
//     }
// ]);
//
// intents.matches('Blockchain.ExchangeRates', [
//     function(session,args,next){
//         session.beginDialog('ExchangeRates');
//     }
// ]);
//
// intents.matches('Blockchain.RecieveBitcoin', [
//     function(session){
//         session.beginDialog('RecieveBitcoin');
//     }
// ]);
//
// intents.matches('Blockchain.SendBitcoin', [
//     function(session){
//         session.beginDialog('SendBitcoin');
//     }
// ]);
//
// intents.matches('qna', [
//     function (session, args, next) {
//         var answerEntity = builder.EntityRecognizer.findEntity(args.entities, 'answer');
//         session.send(answerEntity.entity);
//     }
// ]);
//
// intents.onDefault([
//     function(session){
//         session.send('Sorry, no match found !');
//     }
// ]);
//endregion

//region Dialogs
bot.dialog('Login', [
    function (session) {
        builder.Prompts.text(session, 'Please enter your account address');
    },
    function (session, results) {
        // session.userData.BC_address = results.response;
        session.userData.BC_address = 'e4a65547-1ae4-477d-b15d-61cbdbc71f0c';
        builder.Prompts.text(session, 'Please enter your account password');
    },
    function (session, results) {
        session.userData.BC_password = results.response;
        // session.userData.BC_password = 'YF061191';
        session.userData.BC_is_logged = true;
        session.endDialogWithResult();
    }
]);

bot.dialog('CheckWallet', [
    function(session, args, next) {
        if (!session.userData.BC_is_logged) session.beginDialog('Login');
        else next();
    },
    function (session) {
        var wallet = new MyWallet(session.userData.BC_address, session.userData.BC_password, options);
        wallet.getBalance().then(function (response) {
            session.send('Your current balance is ' + response.balance + ' satoshi');
        }).catch(function (error) {
            session.userData.BC_is_logged = false;
            session.send('Login information incorrect');
            session.replaceDialog('CheckWallet');
        });

        session.endDialog();
    }
]).triggerAction({
    matches:['Blockchain.CheckWallet']
});

bot.dialog('ExchangeRates', [
    function (session, args) {
        var intent = args.intent;
        var amount = builder.EntityRecognizer.findEntity(intent.entities, 'builtin.number').resolution.value || null;
        var currencies = builder.EntityRecognizer.findAllEntities(intent.entities, 'currency') || null;
        var from = currencies[0].resolution.values[0].toUpperCase() || null;
        var to = currencies[1].resolution.values[0].toUpperCase() || null;

        if (!amount) session.send('You have to specify the amount you want to convert');
        else if (from != 'BTC' && to != 'BTC') session.send('One of the currency has to be bitcoin');
        else if (from == 'BTC' && to == 'BTC') session.send('One of the currency has to be different than bitcoin');
        else {
            if (from == 'BTC') {
                exchange.fromBTC(amount, to).then(function (response) {
                    session.send(amount + ' satoshi = ' +  response + ' ' + to);
                }).catch(function (error) {
                    session.userData.BC_is_logged = false;
                    session.send('Something went wrong');
                });
            } else {
                exchange.toBTC(amount, from).then(function (response) {
                    session.send(amount + ' ' + from + ' = ' +  response + ' BTC');
                }).catch(function (error) {
                    session.userData.BC_is_logged = false;
                    session.send('Something went wrong');
                });
            }
        }

        session.endDialog();
    }
]).triggerAction({
    matches:['Blockchain.ExchangeRates']
});

bot.dialog('ReceiveBitcoin', [
    function(session, args, next){
        if (!session.userData.BC_is_logged) session.beginDialog('Login');
        else next();
    },
    function (session) {
        var wallet = new MyWallet(session.userData.BC_address, session.userData.BC_password, options);
        wallet.getBalance().then(function (response) {
            session.send('Your current balance is ' + response.balance + ' satoshi');
        }).catch(function (error) {
            session.userData.BC_is_logged = false;
            session.send('Login information incorrect');
            session.replaceDialog('ReceiveBitcoin');
        });

        session.endDialog();
    }
]).triggerAction({
    matches:['Blockchain.ReceiveBitcoin']
});

bot.dialog('SendBitcoin', [
    function(session, args, next) {
        var intent = args.intent;
        var amount = builder.EntityRecognizer.findEntity(intent.entities, 'builtin.number');
        session.dialogData.BC_send_amount = !amount ? null : amount.resolution.value || null;
        var currency = builder.EntityRecognizer.findEntity(intent.entities, 'currency');
        session.dialogData.BC_send_currency = !currency ? null : currency.resolution.values[0].toUpperCase() || null;
        var address = builder.EntityRecognizer.findEntity(intent.entities, 'wallet');
        session.dialogData.BC_send_address = !address ? null : address.entity || null;

        if (!session.userData.BC_is_logged) session.beginDialog('Login');
        else next();
    },
    function(session) {
        var amount = session.dialogData.BC_send_amount;
        var currency = session.dialogData.BC_send_currency;
        var address = session.dialogData.BC_send_address;

        if (!amount) session.send('You have to specify the amount you want to send');
        else if (!currency || currency != 'BTC') session.send('You can only send bitcoins');
        else if (!address) session.send('You have to specify the address you want to send to');
        else {
            var wallet = new MyWallet(session.userData.BC_address, session.userData.BC_password, options);
            wallet.send(address, amount).then(function (response) {
                session.send('You have sent ' + amount + ' shatoshi to ' + address);
            }).catch(function (error) {
                session.userData.BC_is_logged = false;
                session.send('You don\'t have enough bitcoins');
            });
        }

        session.endDialog();
    }
]).triggerAction({
    matches:['Blockchain.SendBitcoin']
});

bot.dialog('NoMatch', [
    function(session) {
         session.send('Sorry, no match found !');
    }
]).triggerAction({
    matches: /^(?!(Blockchain.))/i
});
//endregion