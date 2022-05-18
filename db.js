(async () => {
    
    const { Level } = require('level')

    // Create a database
    const db = new Level('example', { valueEncoding: 'json' })

    // Add an entry with key 'a' and value 1
    await db.put('a', 1)

    // Add multiple entries
    await db.batch([{ type: 'put', key: 'b', value: 2 }])

    // Get value of key 'a': 1
    const value = await db.get('a')

    // Iterate entries with keys that are greater than 'a'
    for await (const [key, value] of db.iterator({ })) {
    console.log(value) // 2
    }
})();