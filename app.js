const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
const it = rl[Symbol.asyncIterator]();
const clipboardy = require('clipboardy');
const { verify } = require('crypto');
const Database = require('sqlite-async');
const { generate_password } = require('./utils');
require('dotenv').config();

const welcome = async () => {
    console.log("Enter the master password: ");
    let master_pw = await it.next();
    while (master_pw.value != process.env.MASTER_PW) {
        if (master_pw.value === "q") break;
        console.log("Enter the master password: ");
        master_pw = await it.next();
    }
    if (master_pw.value !== process.env.MASTER_PW) {
        process.exit(1);
    }
}

const setup_db = async () => {
    const db = await Database.open("vault.db").catch(e=>{console.error(e)});
    try {
      let query = `CREATE TABLE Vault (
          service_name VARCHAR(255) NOT NULL,
          account_id VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          note VARCHAR(1023),
          PRIMARY KEY (service_name, account_id)
        );`;
      await db.run(query);
      console.log("\nWelcome! Your vault has been created!\nWhat would you like to do?");
    } catch (e) {
      console.log("\nWelcome! Your vault has been loaded!\nWhat would you like to do?");
    }
    return db;
}

const get_option = async (db) => {
    let query = `SELECT * FROM Vault ORDER BY service_name`;
    let rows = await db.all(query);
    if (rows.length === 0) { // if not found, back to option
        console.log(`No vaults were found.`);
        return;
    }
    console.log("Which vault do you want to open?")
    console.log("*********************************");
    for (let i=0; i<rows.length; ++i) {
        let row = rows[i];
        console.log(`${i+1} => Service: ${row.service_name} ID: ${row.account_id}`);
    }
    console.log("***********************************\n");
    let idx = await it.next();
    try {
        idx = idx.value;
        idx--;
        console.log(`~~~~Inside the vault~~~~~`);
        console.log(`ID: ${rows[idx].account_id}\nPassword: ${rows[idx].password}\nNote: ${rows[idx].note?rows[idx].note: ""}`);
        return;
    } catch (e) {
        return;
    }
}

const gen_option = async (db) => {
    console.log("What is the name of the service?");
    let service_name = await it.next();
    service_name = service_name.value.toLowerCase();
    console.log("What is your account ID?")
    let account_id = await it.next();
    account_id = account_id.value;

    let query = `SELECT * FROM Vault WHERE service_name="${service_name}" AND account_id="${account_id}"`;
    let row = await db.get(query).catch(e => { console.error(e) });
    if (row !== undefined) {
        console.log("You already have an account with that name");
        return;
    }
    let password = generate_password();
    query = `INSERT INTO Vault (service_name, account_id, password) VALUES ("${service_name}", "${account_id}", "${password}")`;
    await db.run(query).catch(e => { console.error(e) });
    console.log(`\nYour Password => ${password}`);
    clipboardy.writeSync(password);
    console.log(`Copied to the clipboard!`);
    return;
}

const sto_option = async (db) => {
    console.log("What is the name of the service?");
    let service_name = await it.next();
    service_name = service_name.value.toLowerCase();
    console.log("What is your account ID?")
    let account_id = await it.next();
    account_id = account_id.value;
    console.log("What is your password?");
    let password = await it.next();
    password = password.value;

    let query = `SELECT * FROM Vault WHERE service_name="${service_name}" AND account_id=${account_id}`;
    let row = await db.get(query, (err) => { console.error(err); });
    if (row === undefined) query = `INSERT INTO Vault (service_name, account_id, password) VALUES("${service_name}", "${account_id}", "${password}")`;
    else query = `UPDATE Vault SET password="${password}" WHERE service_name="${service_name}" AND account_id=${account_id}`;
    await db.run(query).catch(err => {console.error(err);});
}


const run = async (db, option) => {
    if (option === 'get') await get_option(db);
    if (option === 'gen') await gen_option(db);
    if (option === 'sto') await sto_option(db);
}


const main = async () => {
    // Master Login
    await welcome();
    const db = await setup_db();

    while (1) {
        console.log("\n***********************************");
        console.log("get : Get Password");
        console.log("sto : Store Password");
        console.log("gen : Generate New Password");
        console.log("q   : Quit");
        console.log("***********************************");
        let option = await it.next();
        option = option.value.toLowerCase();
        if (option === 'q') break;
        await run(db, option);
        console.log("\nHit any key to continue");
        option = await it.next();
        continue;
    }
    db.close();
    console.log("Bye!")
    process.exit(1);
}

main();