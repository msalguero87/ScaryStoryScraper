const cheerio = require('cheerio');
const got = require('got');
var admin = require('firebase-admin');

const jezebel2020StoryWinners = 'https://jezebel.com/10-more-terrifying-tales-to-haunt-your-nightmares-1845453647';
const jezebel2019StoryWinners = 'https://jezebel.com/10-scary-stories-to-ensure-you-never-sleep-again-1845453639';
const redditNoSleepTopWeekly = 'https://www.reddit.com/r/nosleep/top/?t=week';
const redditApiNoSleepTopWeekly = 'https://gateway.reddit.com/desktopapi/v1/subreddits/nosleep?sort=top&t=week';

(async () => {
    var serviceAccount = require("./[file].json");

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://[database].firebaseio.com"
    });

    
    await jezebelScraper(function(post){
        if(!post.author || !post.title) return; 
        var database = admin.database();
        var newRef = database.ref('post').push();
        newRef.set({
            title: post.title,
            summary: post.text, 
            tags: post.tags,
            author: post.author,
            link: post.link,
            source: 'jezebel'
        });

        for (let i = 0; i < post.tags.length; i++) {
            const tag = post.tags[i];
            database.ref('/tags/' + tag + '/posts/' + newRef.key).set({
                title: post.title,
                summary: post.text, 
                author: post.author,
                link: post.link,
                source: 'jezebel'
              });
        }
    });
})();

async function getRedditTopWeeklyApi(addPost){
    const response = await got(redditApiNoSleepTopWeekly);
    var result = JSON.parse(response.body);
    console.log("posts: " + Object.keys(result.posts).length);
    for (const postId in result.posts) {
        let post = result.posts[postId];
        console.log(post.title);
        console.log(post.author);
        let postData = await got("https://www.reddit.com/r/nosleep/api/info.json?id="+postId);
        let postResult = JSON.parse(postData.body);
        if(postResult.data && postResult.data.children && postResult.data.children.length){
            var articleText = postResult.data.children[0].data.selftext;
            const tags = await analyze({title: post.title, author: post.author, text: articleText});
            if(addPost)
                addPost({title: post.title, author: post.author, tags: unique(tags), text: getFirstNWords(articleText, 50), link: post.permalink});
        }
    }
}

function unique(a) {
    var seen = {};
    a = a.filter(function(item){
        return !item.includes(".") && !item.includes("#") && !item.includes("$") && !item.includes("[") && !item.includes("]");
    });
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

function getFirstNWords(text, count){
    const words = text.split(' ');
    if(words.length <= count){
        return words;
    }else{
        return words.slice(0,count - 1).join(' ');
    }
}

async function jezebelScraper(addPost){
  const response = await got(jezebel2020StoryWinners);
  const $ = cheerio.load(response.body);

  $("h2").each(async function(index, element){ 
    var titleElement = $(element).find("em")[0];
    if(!titleElement) return;
    var title = titleElement.children[0].data;
    var list = $(element).contents().filter(function(i, item) { return item.type === "text"; });
    var author = $(list[0]).text()
    //console.log(title + " " + author);

    var articleElement = element.next;
    var iframe = articleElement.children[0];
    var iframeSrc = iframe.attribs.src;
    const iframeResponse = await got(iframeSrc);
    const $2 = cheerio.load(iframeResponse.body);

    //var iframeContent = $(iframe).contents().find('html');
    var articleText = "";
    var paragraphs = $2("p");
    paragraphs.each(function(i, paragraph){
        articleText += $(paragraph).text();
    });
    //console.log(articleText);
    const tags = await analyze({title: title, author: author, text: articleText});
    if(addPost)
        addPost({title: title, author: author, tags: unique(tags), text: getFirstNWords(articleText, 50), link: jezebel2020StoryWinners + "#" + element.attribs.id});
  });
}

async function analyze(post) {
    // Imports the Google Cloud client library
    const language = require('@google-cloud/language');
  
    // Instantiates a client
    const client = new language.LanguageServiceClient({
        keyFilename: './[file].json'
    });
  
    // The text to analyze
    const text = post.text;
  
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };
  
    // Detects the sentiment of the text
    //const [result] = await client.analyzeSentiment({document: document});
    //const sentiment = result.documentSentiment;
  
    
    //console.log(`Sentiment score: ${sentiment.score}`);
    //console.log(`Sentiment magnitude: ${sentiment.magnitude}`);

    // Detects sentiment of entities in the document
    /*const [result] = await client.analyzeEntitySentiment({document});
    const entities = result.entities;
    console.log(`Text: ${post.title}`);
    console.log('Entities and sentiments:');
    entities.forEach(entity => {
        console.log(`  Name: ${entity.name}`);
        console.log(`  Type: ${entity.type}`);
        console.log(`  Score: ${entity.sentiment.score}`);
        console.log(`  Magnitude: ${entity.sentiment.magnitude}`);
    });*/

    // Detects entities in the document
    const [result] = await client.analyzeEntities({document});

    const entities = result.entities;

    console.log(`Text: ${post.title} by ${post.author}`);
    console.log('Entities: ' + entities.length);
    return entities.map(entity => entity.name);
    entities.forEach(entity => {
        console.log(entity.name);
        console.log(` - Type: ${entity.type}, Salience: ${entity.salience}`);
        if (entity.metadata && entity.metadata.wikipedia_url) {
            console.log(` - Wikipedia URL: ${entity.metadata.wikipedia_url}`);
        }
    });
  }