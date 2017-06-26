'use strict';

const Bot = require('./Bot');
const request = require('superagent');
const wikiAPI = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles="
const wikiURL = 'https://en.wikipedia.org/wiki/'

const bot = new Bot({
  token: process.env.SLACK_TOKEN,
  autoReconnect: true,
  autoMark: true
})

// Take the message text and return the arguments
function getArgs(msg) {
  return msg.split(' ').slice(1);
}

function getWikiSummary(term, cb) {
  // replace spaces with unicode
  let parameters = term.replace(/ /g, '%20');

  request
    .get(wikiAPI + parameters)
    .end((err, res) => {
      if (err) {
        cb(err);
        return;
      }

      let url = wikiURL + parameters;

      cb(null, JSON.parse(res.text), url);
    });
}

// Take the message text and return the arguments
function getArgs(msg) {
  return msg.split(' ').slice(1);
}


bot.respondTo('help', (message, channel) => {
  bot.send(`To use my Wikipedia functionality, type \`wiki\` followed by your search query`, channel);
}, true);

bot.respondTo('wiki', (message, channel, user) => {
  if (user && user.is_bot) {
    return;
  }

  // grab the search parameters, but remove the command 'wiki' from the beginning
  // of the message first
  let args = message.text.split(' ').slice(1).join(' ');

  // if there are no arguments, return
  if (args.length < 1) {
    bot.send('I\'m sorry, but you need to provide a search query!', channel);
    return;
  }

  getWikiSummary(args, (err, result, url) => {
    if (err) {
      bot.send(`I\'m sorry, but something went wrong with your query`, channel);
      console.error(err);
      return;
    }

    let pageID = Object.keys(result.query.pages)[0];

    // -1 indicates that the article doesn't exist
    if (parseInt(pageID, 10) === -1) {
      bot.send('That page does not exist yet, perhaps you\'d like to create it:', channel);
      bot.send(url, channel);
      return;
    }

    let page = result.query.pages[pageID];
    let summary = page.extract;

    if (/may refer to/i.test(summary)) {
      bot.send('Your search query may refer to multiple things, please be more specific or visit:', channel);
      bot.send(url, channel);
      return;
    }

    if (summary !== '') {
      bot.send(url, channel);

      let paragraphs = summary.split('\n');

      paragraphs.forEach((paragraph) => {
        if (paragraph !== '') {
          bot.send(`> ${paragraph}`, channel);
        }
      });
    } else {
      bot.send('I\'m sorry, I couldn\'t find anything on that subject. Try another one!', channel);
    }
  });
}, true);
