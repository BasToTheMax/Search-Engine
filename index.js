(async () => {
    const express = require('express');
    const config = require('./config.json');
    const chalk = require('chalk');

    var Crawler = require("crawler");
 
// Queue just one URL, with default callback
// c.queue('http://www.amazon.com');
 
    

    const knex = require('knex')({
        client: 'better-sqlite3',
        connection: {
        filename: __dirname + '/' + config.database
        },
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

    app.set('json spaces', 2);

    var c = new Crawler({
        maxConnections : 3,
        rateLimit: 500,
        // This will be called for each crawled page
        callback : async function (error, res, done) {
            if(error){
                console.log('oh no an error', error);
                done();
            }else{
                var $ = res.$;
                var siteID = res.options.siteID;
                var url = res.options.url;

                if (!$) {
                    await knex('sites')
                    .where('ID', siteID)
                    .update({
                        name: url,
                        description: 'No information available',
                        lastcrawldate: Date.now()
                    });
                    done();
                    return console.log(`Site has no HTML :( - site ${url}`);
                }

                var siteTitle = $("title").text();
                var siteDesc = $("meta[name=description]").attr('content');
                // console.log(siteTitle, siteDesc);
                if (!siteDesc) {
                    siteDesc = $("p").text();
                    // console.log(siteDesc);
                }

                await knex('sites')
                    .where('ID', siteID)
                    .update({
                        name: siteTitle,
                        description: siteDesc,
                        lastcrawldate: Date.now()
                    });
                
                console.log(`Crawled site: ${url} (${siteID})`);
            }
            done();
        }
    });

    setInterval(async () => {
        var leastCrawledSite = await knex('sites')
        .orderBy('lastcrawldate')
        .limit(1);

        var site = leastCrawledSite[0];
        var lastcd = site['lastcrawldate'];
        var url = site['url'];

        if ((Date.now() - lastcd) > 30 * 1000) {
            c.queue({
                uri: url,
                siteID: site['ID'],
                url: site['url']
            });
        }
    }, 2.5 * 1000);

    app.use(express.static(__dirname + '/public'));

    app.get('/api/search', async (req, res) => {
        const { q, page } = req.query;
        
        if (!q || !page) return res.json({ok:false});

        var p = parseInt(page);
        if (p < 1) {
            p = 1;
        }

        var ress = await knex('sites')
        .whereLike('name', `%${q}%`)
        .orWhereLike('description', `%${q}%`)
        .orWhereLike('url', `%${q}%`)
        .orderBy('ID')
        .limit(25)
        .offset( ( p - 1) * 25 );

        var resc = await knex('sites')
        .whereLike('name', `%${q}%`)
        .orWhereLike('description', `%${q}%`)
        .orWhereLike('url', `%${q}%`)
        .orderBy('ID')
        .count('*');

        var count = Math.floor(resc[0]['count(*)'] / 25);

        var reso;
        reso = {
            data: ress
        };

        reso.page = page;
        reso.totalPages = count;
        if (parseInt(page) == reso.totalPages) {
            reso.nextPage = parseInt(page);
            reso.hasNextPage = false;
        } else {
            reso.nextPage = parseInt(page) + 1;
            reso.hasNextPage = true;
        }

        res.json(reso);
    });

    app.listen(3000, () => {
        console.log(`App online`);
    });
})();