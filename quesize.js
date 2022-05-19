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

    var qc = await knex('sites')
        .where({
            name: 'In crawl queue'
        }).count();

    var ac = await knex('sites').count();

    // console.log(qc, qc[0]['count(*)'], qc[0]);

    console.clear();

    console.log(`Total sites in queue: ${qc[0]['count(*)']}`);
    console.log(`Total sites: ${ac[0]['count(*)']}`);
    console.log(`Total crawled sites: ${ac[0]['count(*)'] - qc[0]['count(*)']}`);

    var cc = ac[0]['count(*)'] - qc[0]['count(*)'];

    console.log(`crawled percent: ${Math.round(cc / ac[0]['count(*)'] * 100)}%`);

    process.exit();

})();