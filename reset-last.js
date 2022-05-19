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

    await knex('sites')
        .update({
            lastcrawldate: 0
        });

    console.log('all things reset');
    process.exit(0);
})();