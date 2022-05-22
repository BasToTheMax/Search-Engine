(async () => {
    const config = require('./config.json');
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

    const args = process.argv.slice(2);
    // var url = args[0];

    args.forEach(async (url) => {
        var s = await knex('sites').where({
            url: `https://${url}`
        });
        if (s[0]) {

            await knex('sites')
            .where({
                url: `https://${url}`
            })
                .update(
                    {
                        lastcrawldate: parseInt(String('-' + Date.now()))
                    }
                );

            return console.log(`${url} already exists!`);
        }

        if (url.endsWith('zip') || url.endsWith('md5!') || url.endsWith('tar.gz') || url.endsWith('sha1!')) return console.log(
    	    `URL is zip file`
        );

        await knex('sites')
        .insert([
            {
                ID: Date.now(),
                name: url,
                url: `https://${url}`,
                description: url,
                lastcrawldate: parseInt(String('-' + Date.now()))
            }
        ]);
        console.log(`added ${url}`);
    });

    console.log('Adding...');
    // process.exit(0);
})();