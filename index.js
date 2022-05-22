(async () => {
    const express = require('express');
    const config = require('./config.json');
    const chalk = require('chalk');
    const url = require('url');

    var Crawler = require("crawler");
    const prompt = require('prompt-sync')();
 
// Queue just one URL, with default callback
// c.queue('http://www.amazon.com');


    var needToQue;
    needToQue = [];
 
    

    const knex = require('knex')({
        client: 'mysql',
        connection: config.database,
        useNullAsDefault: true,
        migrations: {
            tableName: 'migrations'
        },
        debug: false,
        log: {
            warn(message) {
                console.log('db - warn - ', message)
            },
            error(message) {
                console.log('db - error - ', message)
            },
            deprecate(message) {
                console.log('db - deprecate - ', message)
            },
            debug(message) {
                console.log('db - ', message.__knexQueryUid + ': '+ message.sql)
            },
        }
    });
    const app = express();

    app.use((req, res, next) => {
        var a;
        a = '';

        if (req.path == '/search.html') return next();

        if (req.path == '/api/search') {
            a = `- ${chalk.green(req.query.q)} (${chalk.yellow(req.query.page)})`;
        } else {
            a = `${needToQue.length} sites in queue`;
        }
        
        console.log(`${chalk.blue(req.method)} ${chalk.red(req.path)} ${a}`);
        next();
    });

    app.set('json spaces', 2);

    var c = new Crawler({
        maxConnections : 1,
        rateLimit: 2.5 * 1000,
        // This will be called for each crawled page
        callback : async function (error, res, done) {
            if(error){
                console.log('oh no an error', error);
                done();
            }else{
                var $ = res.$;
                var siteID = res.options.siteID;
                var url = res.options.url;

                var alr;
                var neq;
                alr = 0;
                neq = 0;

                if (!$) {
                    await knex('sites')
                    .where('ID', siteID)
                    .update({
                        name: url,
                        description: 'No information available',
                        lastcrawldate: Date.now()
                    });
                    done();
                    await knex('sites')
                    .where('ID', siteID)
                    .del();
                    return console.log(`Site has no HTML :( - site ${url}`);
                }

                var siteTitle = $("title").text();
                var siteDesc = $("meta[name=description]").attr('content');
                // console.log(siteTitle, siteDesc);
                if (!siteDesc) {
                    siteDesc = $("p").text();
                    // console.log(siteDesc);
                }

                

                var links = $('a');
                $(links).each(async function(i, link){
                    var newu;
                    newu = url;
                    newu = String(newu).replace('https://', '').toString();
                    // console.log(newu);
                    if (newu.includes('/')) {
                        // newu = newu.toString().spit('/')[newu.toString().spit('/').length - 1];
                    }
                    const fullurl = new URL($(link).attr('href'), 'https://' + newu);
                    // console.log(fullurl.toString());
                    // console.log($(link).attr('href'));

                    needToQue.push(fullurl.toString())
                });

                // console.log(`\t\t${alr} sites where already in the database!`);
                // console.log(`\t\tAdded ${neq} new sites to the queue!`);

                siteTitle = siteTitle.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
                siteDesc = siteDesc.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

                siteTitle = Buffer.from(siteTitle, 'utf-8').toString();
                siteDesc = Buffer.from(siteDesc, 'utf-8').toString();

                await knex('sites')
                    .where('ID', siteID)
                    .update({
                        name: siteTitle.substring(0, 50),
                        description: siteDesc.substring(0, 150),
                        lastcrawldate: Date.now()
                    });
                
                console.log(chalk.yellow(`Crawled site: ${url} (${siteID})`));
            }
            done();
        }
    });

    c.on('drain',function(){
        setTimeout(reqNeqSite, 0.5 * 1000);
        // reqNeqSite();
    });

    console.log('Crawling? (yes / no)');
    if (config.crawl == 'yes') {
        reqNeqSite();
    }

    setInterval(async () => {
        var a = needToQue[0];

        if (!a) return;

        var aaa = await knex('sites').where({
            url: a
        });

        if (!aaa[0]) {
            console.log(chalk.green(`Queue: ${a}`));

            await knex('sites').insert([
                {
                    ID: parseInt(Date.now()),
                    lastcrawldate: 0,
                    name: 'In crawl queue',
                    description: 'The site is in the crawl queue!',
                    url: a
                }
            ]);
        } else {
            // console.log(chalk.green(`Already: ${a}`));
        }

        needToQue.shift();
    }, 1.5 * 1000);

    async function reqNeqSite() {
        var leastCrawledSite = await knex('sites')
        .orderBy('lastcrawldate')
        .limit(1);

        var site = leastCrawledSite[0];
        var lastcd = site['lastcrawldate'];
        var url = site['url'];

        if (String(url).startsWith('http') == false && String(url).startsWith('https') == false) {
            return console.log(`Invalid protocol: ${String(url).split(':')[0]}`);
        }

        if ((Date.now() - lastcd) > 30 * 1000) {
            c.queue({
                uri: url,
                siteID: site['ID'],
                url: site['url']
            });

            await knex('sites')
                .where('ID', site['ID'])
                .update({
                    lastcrawldate: Date.now()
                });
        }
    }

    app.use(express.static(__dirname + '/public'));

    app.get('/api/search', async (req, res) => {
        var { q, page } = req.query;
        
        if (!q || !page) return res.json({ok:false});

        q = q.toLowerCase();

        var p = parseInt(page);
        if (p < 1) {
            p = 1;
        }

        var ress = await knex('sites')
        .whereLike('name', `%${q}%`)
        .orWhereLike('description', `%${q}%`)
        .orWhereLike('url', `%${q}%`)
        .orderBy('clicks', 'desc')
        .limit(10)
        .offset( ( p - 1) * 10 );

        var resc = await knex('sites')
        .whereLike('name', `%${q}%`)
        .orWhereLike('description', `%${q}%`)
        .orWhereLike('url', `%${q}%`)
        .orderBy('clicks', 'desc')
        .count('*');

        var count = Math.ceil(resc[0]['count(*)'] / 10);

        var reso;
        reso = {
            data: ress
        };

        reso.page = page;
        reso.totalPages = count;
        reso.totalRes = resc[0]['count(*)'];
        if (parseInt(page) == reso.totalPages) {
            reso.nextPage = parseInt(page);
            reso.hasNextPage = false;
        } else {
            reso.nextPage = parseInt(page) + 1;
            reso.hasNextPage = true;
        }

        res.json(reso);
    });

    app.get(`/click/:id`, async (req, res) => {
        var id = req.params.id;

        var site = await knex('sites').where({
            ID: id
        });

        await knex('sites').where({
            ID: id
        }).update({
            clicks: site[0].clicks + 1
        });

        if (!site[0]) return res.redirect('/');

        res.redirect(site[0]['url']);
    });

    app.listen(3003, () => {
        console.log(`App online`);
        // ask();
    });
    function ask() {
        var res = prompt('> ');
        if (res == 'exit') {
            process.exit();
        }

        ask();
    }
    // ask();
})();
