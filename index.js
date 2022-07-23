const http = require('http');
const path = require('path');
const fs = require('fs');
const { getClient } = require('./get-client');

const hostname = 'localhost';
const port = 3000;


(async () => {
	const client = await getClient();
	await setupTable(client);

	const server = http.createServer((req, res) => {

		// build filepath
		let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);

		// extensions of file
		let extName = path.extname(filePath)

		// Check ext and set content type
		switch (extName){
				case '.js':
						contentType = 'text/javascript';
						break;
				case '.html':
						contentType = 'text/html';
						break;
				case '.json':
						contentType = 'application/json';
						break;
				case '.css':
						contentType = 'text/css';
						break;
}

		let data = ''

		req.on('data', chunk => {
			data += chunk
		})

		req.on('end', async () => {
		
			if (req.method === 'GET'){
				if (req.url === '/posts' || req.url === '/posts/'){
					const entries = await client.query(`SELECT * FROM todo ORDER BY id DESC`);
					res.writeHead(200, {'Content-Type':'application/json'});
					res.end(JSON.stringify(entries.rows));
				} else if (req.url.slice(0,7) === '/posts/'){
					const idURL = req.url.slice(7);
					if (Number.isInteger(parseFloat(idURL)) && !isNaN(idURL)){
						const entries = await client.query(`SELECT * FROM todo WHERE id = '${idURL}'`);

						if (!entries.rows.length){
							res.writeHead(404);
							res.end('this id does not exist');
						} else {
							res.writeHead(200, {'Content-Type':'application/json'});
							res.end(JSON.stringify(entries.rows));	
						}
					} else {
						res.writeHead(400)
						res.end('This is not a valid id, use only numbers')
					}
				} else {
					fs.readFile(filePath, (err, content) => {
						if (err){
							if (err.code === 'ENOENT'){
								res.writeHead(404)
								res.end('Not found')
							} else {
									res.writeHead(500);
									res.end(`Server error: ${err}`)
							}
						} else {
								// Success 
								res.writeHead(200, {'Content-Type':contentType});
								res.end(content)
						}
					})
				}
			}

			if (req.method === 'POST'){
				const todoKeys = ['title', 'description'] // status is not allowed, I can change that in the future though.

				if (req.url === '/posts' || req.url === '/posts/'){

					dataObj = JSON.parse(data)

					if (areEqual(Object.keys(dataObj), todoKeys) === true && hasInvalidCharacter(dataObj) === false){

						const postId = await insertRow(client, dataObj.title, dataObj.description);

						res.writeHead(301, {'Location':`/posts/${postId.rows[0].id}`});
						res.end()
					} else {
						res.writeHead(422);
						res.end('Dolar Sign $ at the end of the string and double dolar signs $$ are not allowed. You have to specify only the keys "title" and "description"')
					}
					
				} else {
					res.writeHead(404);
					res.end();
				}
			}

			if (req.method === 'PUT'){

				const idURL = req.url.slice(7);
				if (Number.isInteger(parseFloat(idURL)) && !isNaN(idURL)){ // '1f' would return 1 on the first condition, so I added one more condition to prevent that from being allowed

					const entries = await client.query(`SELECT * FROM todo WHERE id = '${idURL}'`)
					const allowedKeys = ['title', 'description', 'status'];
					dataObj = JSON.parse(data);
					dataObjKeys = Object.keys(dataObj);
					dataObjValues = Object.values(dataObj);

					if (!entries.rows.length){
						res.writeHead(404);
						res.end();
					} else {
						if (arrayShareSameItems(allowedKeys, dataObjKeys)){

							if (!isStatusValid(dataObj.status)){
								res.writeHead(400)
								res.end('Invalid status value')
							} else {
								if (hasInvalidCharacter(dataObj)){
									res.writeHead(400)
									res.end('Sorry. Dolar Sign $ at the end of the string and double dolar signs $$ are not allowed')
								} else {
									await updateTable(client, dataObjKeys, dataObjValues, idURL)
									res.writeHead(204, {'Location':'/posts'});
									res.end();	
								}
							}
							
						} else {
							res.writeHead(400);
							res.end(JSON.stringify({error:'Use a valid key'}));	
						}
					}
				} else {
					res.writeHead(404);
					res.end(JSON.stringify({error:'not found'}));
				}
				
			}

			if (req.method === 'DELETE'){
				const idURL = req.url.slice(7);
				if (Number.isInteger(parseFloat(idURL)) && !isNaN(idURL)){
					await deleteTable(client, idURL)
					res.writeHead(200)
					res.end(JSON.stringify({info:'If the specified id existed it was deleted else the DELETE method request was just ignored.'}))
				}
				else {
					res.writeHead(400)
					res.end('This is not a valid id, use only numbers')
				}
			}
		})

	})

	server.listen(port, hostname, () => {
		console.log(`Server running at http://${hostname}:${port}/`)
	})	
})()


async function insertRow(client, title, description){
	let insertRowQuery = `
	INSERT INTO todo (title, description) VALUES ($$${title}$$, $$${description}$$)
	RETURNING ID;
	`;

	return await client.query(insertRowQuery);
}

async function setupTable(client) { // Function with same functionality as in the 'setup-table.js' file
  let createTableQuery = `
    CREATE TABLE IF NOT EXISTS todo(
      id SERIAL PRIMARY KEY,
      title varchar(500),
      description varchar(10000),
      status boolean DEFAULT false
    );
  `;
  return await client.query(createTableQuery);
}

async function updateTable(client, keys, values, id){
	if (keys.length > 1){ 
		values = concatToPostgresSyntax(values)
		let updateTableQuery = `
		UPDATE todo
		SET (${keys}) = ${values}
		WHERE id = ${id};
		` ;
		return await client.query(updateTableQuery)
	} else { // postgres syntax does not allow column-list syntax with only one value
		let key = keys;
		let value = values;
		let updateTableQuery = `
		UPDATE todo
		SET ${key} = $$${value}$$
		WHERE id = ${id};
		`;
		return await client.query(updateTableQuery)
	}
}

async function deleteTable(client, id){
	let deleteTableRowQuery = `
	DELETE FROM todo
	WHERE id = ${id};
	`

	return await client.query(deleteTableRowQuery)
}

function areEqual(arr1, arr2){
	if (arr1.length != arr2.length){
		return false
	}

	arr1 = arr1.concat().sort();
	arr2 = arr2.concat().sort();

	for (let i = 0; i < arr1.length; i++){
		if (arr1[i] != arr2[i]){
			return false
		}
	}

	return true
}

function arrayShareSameItems(originalArr, compareToArr){
	for (let i = 0; i < compareToArr.length; i++){
		if (!originalArr.includes(compareToArr[i])){
			return false
		}
	} return true;
}

function concatToPostgresSyntax(keys){
	let keysPostgres = ''
	for (i in keys){
		if (i != keys.length -1){
		keysPostgres += `$$${keys[i]}$$,`
	} else {
		keysPostgres += `$$${keys[i]}$$`
	}}

	return `(${keysPostgres})`
}

function isStatusValid(value){
	if (value === undefined){return true}
	
	const allowedValues = [
			true, 'true',  'y', 'yes', 'on', 1, // postgres valid values for the "true" state
			false, 'false', 'f', 'false', 'n', 'no', 'off',  0 // postgres valid values for the "false" state
	]

	if (allowedValues.includes(value)){return true} else {return false};
}

function hasInvalidCharacter(dataObject){
	let notAllowedStrings = '$$'

	if ('title' in dataObject){
		if (dataObject.title.includes('$$') || dataObject.title.slice(dataObject.title.length-1) === '$'){return true}
	}
	if ('description' in dataObject){
		if (dataObject.description.includes('$$') || dataObject.description.slice(dataObject.description.length-1) === '$'){return true}
	}

	return false
}