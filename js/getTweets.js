const dotenv = require("dotenv");
const _ = require("lodash");
const moment = require("moment");
const Twitter = require("twitter");

const existing = require("../data/cases.json");

dotenv.config();

const {
  env: {
    CONSUMER_KEY: consumer_key,
    CONSUMER_SECRET: consumer_secret,
    ACCESS_TOKEN_KEY: access_token_key,
    ACCESS_TOKEN_SECRET: access_token_secret,
  },
} = process;

const client = new Twitter({
  consumer_key,
  consumer_secret,
  access_token_key,
  access_token_secret,
});

/**
 *
 * @param {{full_text: string, created_at: string, id_str: string}} twt
 */
function parseTweet(twt) {
  const lines = twt.full_text.split("\n");
  let confirmed, recovered, deaths, date;

  try {
    const confirmedLine = lines
      .find((line) => /confirmed/i.test(line))
      .split(":");

    confirmed = +confirmedLine[confirmedLine.length - 1]
      .replace(",", "")
      .trim();
    recovered = +lines
      .find((line) => /recovered/i.test(line))
      .split(":")[1]
      .replace(",", "")
      .trim();
    deaths = +lines
      .find((line) => /deaths/i.test(line))
      .split(":")[1]
      .replace(",", "")
      .trim();
    date = moment(twt.created_at).format("MM/DD/YYYY");
  } catch (err) {
    console.log(err, twt);
  }
  return {
    confirmed,
    recovered,
    deaths,
    date,
    source: "https://twitter.com/cityoflubbock/status/" + twt.id_str,
  };
}

async function getLast200() {
  const since_id = _.last(_.last(existing).source.split('/'));
  const tweets = await client.get("statuses/user_timeline", {
    screen_name: "cityoflubbock",
    count: 200,
    trim_user: 1,
    since_id, //since_id: "1283898809005805569", // put tweet id here if it gets too far out of sync
    //max_id: "1299821117771743235", // stopping point
  });
  const covidRelated = tweets.filter((tweet) => tweet.text.includes("as of")); // probably a covid update in english

  const covidRelatedIds = covidRelated.map((t) => t.id_str); // main tweet id

  const fullTweets = await client.get("statuses/lookup", {
    screen_name: "cityoflubbock",
    id: covidRelatedIds.join(","),
    tweet_mode: "extended",
  });

  const data = _.orderBy(fullTweets.map(parseTweet), "id");
  console.log(JSON.stringify(data));
}

getLast200();
