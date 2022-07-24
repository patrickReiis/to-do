const myURL = new URL('/posts/', window.location.origin);
const postForm = document.getElementById('create-form');
const titleForm = document.getElementById('create-title');
const descriptionForm = document.getElementById('create-description');

getAllPosts(myURL)

postForm.addEventListener('submit', e => {
	e.preventDefault()

	const todoObject = convertPostToObject(titleForm.value, descriptionForm.value);

	fetchAllMethods('POST', null, todoObject)

	titleForm.value = ''
	descriptionForm.value = ''
})

function displayPosts(jsondata, ulElement){

	const fragment = document.createDocumentFragment()
	for (let i = 0; i < jsondata.length; i++){

		const textareaTitle = document.createElement('textarea');
		textareaTitle.rows = 3;
		textareaTitle.maxLength = 500;
		textareaTitle.classList.add('main__title');
		textareaTitle.textContent = jsondata[i].title;

		const textareaDescription = document.createElement('textarea');
		textareaDescription.rows = 15;
		textareaDescription.maxLength = 10000;
		textareaDescription.classList.add('main__description');
		textareaDescription.textContent = jsondata[i].description;
		textareaDescription.tabIndex = 2

		const titleDescDiv = document.createElement('div'); // div that will contain title <textarea> and description <textarea>
		titleDescDiv.classList.add('main-content');
		titleDescDiv.appendChild(textareaTitle);
		titleDescDiv.appendChild(textareaDescription);
		titleDescDiv.tabIndex = 1

		const inputCheckBox = document.createElement('input'); // button that represents if the task is done
		inputCheckBox.classList.add('done-checkbox');
		inputCheckBox.type = 'checkbox';
		inputCheckBox.checked = jsondata[i].status

		const label = document.createElement('label');
		label.textContent = 'Done'
		label.appendChild(inputCheckBox);

		const saveInput = document.createElement('input');
		saveInput.value = 'Update';
		saveInput.type = 'submit';
		saveInput.classList.add('button-submit-general', 'create-general-style');

		const deleteInput = document.createElement('input');
		deleteInput.type = 'button';
		deleteInput.value = 'Delete';
		deleteInput.classList.add('button-submit-general', 'create-general-style');
		deleteInput.addEventListener('click', handleDelete);

		const settingsDiv = document.createElement('div');
		settingsDiv.classList.add('settings');
		settingsDiv.appendChild(label);
		settingsDiv.appendChild(saveInput);
		settingsDiv.appendChild(deleteInput);

		const formUpdateElement = document.createElement('form');
		formUpdateElement.appendChild(titleDescDiv);
		formUpdateElement.appendChild(settingsDiv);
		formUpdateElement.method = 'POST';
		formUpdateElement.classList.add('form-data-posts')

		const listElement = document.createElement('li');
		listElement.appendChild(formUpdateElement);
		listElement.id = jsondata[i].id

		fragment.appendChild(listElement);
	}

	ulElement.appendChild(fragment);
	ulElement.addEventListener('submit', handleUpdate);

}

async function fetchAllMethods(method, id, content){
	const myURL = new URL('/posts/', window.location.origin);
	if (method === 'POST'){
		
		try{
			const responseURL = await fetch(myURL, {
				method: `${method}`,
				headers: {
					'Content-Type':'application/json'
				},
				body:JSON.stringify(
					content
				)
			 })
			if (responseURL.ok){
				const data = await responseURL.json();
				console.log(JSON.stringify(data[0]));
				reloadPage();
				
			} else {
				const errorObj = await responseURL.json();

				const errorElement = document.getElementById('error-message-POST');
				errorElement.style.display = 'block'
				errorElement.textContent = errorObj.errorMessage

			}
		} catch(err){
			console.log(err)
		}

	} else if (method === 'PUT'){
		const urlId = myURL.href + `${id}`;

		try{
			const responseURL = await fetch(urlId, {
				method: `${method}`,
				headers: {
					'Content-Type':'application/json'
				},
				body:JSON.stringify(
					content
				)
			 })
			if (responseURL.ok){
				if (responseURL.status === 204){
					console.log(`${responseURL.status}`);
				} reloadPage();
				
			} else {

				const errorObj = await responseURL.json();
				
				const errorElement = document.createElement('div');
				errorElement.textContent = errorObj.errorMessage
				errorElement.classList.add('error-messages-PUT');

				const listPostElement = document.getElementById(id);

				if (listPostElement.getElementsByClassName('error-messages-PUT').length < 1){
					listPostElement.appendChild(errorElement)

					const titlePostDiv = listPostElement.getElementsByClassName('main__title')[0];
					titlePostDiv.style.background = '#FF6868';

					const descPostDiv = listPostElement.getElementsByClassName('main__description')[0];
					descPostDiv.style.background = '#FF6868';	
				}
			}
		} catch(err){
			console.log(err)
		}


	} else if (method === 'DELETE'){
		const urlId = myURL.href + `${id}`;
		console.log(urlId)
		try{
			const responseURL = await fetch(urlId, {
				method: 'DELETE',
				headers: {
					'Content-Type':'application/json'
				},
			 });

			if (responseURL.ok){
				console.log(`Successful ${responseURL.status}`);
				reloadPage();
			} else {
				console.log(`Not Successful: ${responseURL.status}`);
			}
		} catch(err){
			console.log(err)
		}


	} else {
		return 'Not a valid method'
	}
}

function convertPostToObject(title, description){
	const todoObject = {}

	todoObject.title = title
	todoObject.description = description

	return todoObject
}

async function getAllPosts(urlGET){
	
	try{
		const responseURL = await fetch(urlGET, {
			method: 'GET',
			headers: {
				'Content-Type':'application/json'
			},
		 });

		const ulElement = document.getElementById('main-only-ul');

		if (responseURL.ok){
			const data = await responseURL.json();
			displayPosts(data, ulElement);
		} else {
			console.log(`Not Successful: ${responseURL.status}`)
		}
	} catch(err){
		console.log(err)
	}

}

async function handleUpdate(e){
	e.preventDefault();

	const postId = await e.target.parentElement.id;
	const title = await e.target.querySelector('.main-content').firstElementChild.value;
	const description = await e.target.querySelector('.main-content').lastElementChild.value;
	const status = await e.target.querySelector('.main-content').nextElementSibling.firstElementChild.firstElementChild.checked;
	const content = {'title':title, 'description':description, 'status':status};

	await fetchAllMethods('PUT', postId, content);
}

function handleDelete(e){
	e.preventDefault();
	const postId = e.target.parentElement.parentElement.parentElement.id;
	
	fetchAllMethods('DELETE', postId);
}

function reloadPage(){
	history.go(0);
}

function displayErrorMessages(err){

}
