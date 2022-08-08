# Exploratory Visual Modeling (EVM)

This is the codebase for the interface presented in Chapter 6 of my disseration. 
You can find the corresponding github repo at https://github.com/MUCollective/exploratory_modeling

## Get started

Install the dependencies...

```bash
cd interface
npm install
sh scripts/semverFix.sh
```

...then start [Rollup](https://rollupjs.org):

```bash
npm run dev
```

Navigate to [localhost:5555](http://localhost:5555). You should see your app running. Edit a component file in `src`, save it, and reload the page to see your changes. We used port 5555 because port 5000 will be occupied for users of Mac OS v12 (Monterey). You can change the port by opening `package.json` and editing the value of `{ "scripts": {... "start": "sirv public --no-clear --port 5555" }}`.

By default, the server will only respond to requests from localhost. To allow connections from other computers, edit the `sirv` commands in package.json to include the option `--host 0.0.0.0`.

If you're using [Visual Studio Code](https://code.visualstudio.com/) we recommend installing the official extension [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode). If you are using other editors you may need to install a plugin in order to get syntax highlighting and intellisense.

## Building and running in production mode

To create an optimised version of the app:

```bash
npm run build
```

You can run the newly built app with `npm run start`. This uses [sirv](https://github.com/lukeed/sirv), which is included in your package.json's `dependencies` so that the app will work when you deploy to platforms like [Heroku](https://heroku.com).


## Single-page app mode

By default, sirv will only respond to requests that match files in `public`. This is to maximise compatibility with static fileservers, allowing you to deploy your app anywhere.

If you're building a single-page app (SPA) with multiple routes, sirv needs to be able to respond to requests for *any* path. You can make it so by editing the `"start"` command in package.json:

```js
"start": "sirv public --single"
```

## Using TypeScript

This template comes with a script to set up a TypeScript development environment, you can run it immediately after cloning the template with:

```bash
node scripts/setupTypeScript.js
```

Or remove the script via:

```bash
rm scripts/setupTypeScript.js
```

If you want to use `baseUrl` or `path` aliases within your `tsconfig`, you need to set up `@rollup/plugin-alias` to tell Rollup to resolve the aliases. For more info, see [this StackOverflow question](https://stackoverflow.com/questions/63427935/setup-tsconfig-path-in-svelte).

## Deploying to the web

### With [Vercel](https://vercel.com)

Install `vercel` if you haven't already:

```bash
npm install -g vercel
```

Then, from within your project folder:

```bash
cd public
vercel deploy --name my-project
```

### With [surge](https://surge.sh/)

Install `surge` if you haven't already:

```bash
npm install -g surge
```

Then, from within your project folder:

```bash
npm run build
surge public my-project.surge.sh
```

## Save interaction logs to Google Cloud

This template provides a interface to save all user interaction logs to database. You need to get access to the "evm-interaction-logs" project by contacting the contributors.

Setting up your client credentials if needed (see [this guide](https://cloud.google.com/bigquery/docs/authentication/end-user-installed) for using client credential to authenticate the API).

You may want to save the client secret JSON file into this directory, and note the file path for later.

Install the dependencies...

```shell
cd backend
pip install -r requirements.txt
```

...run the backend:

```shell
python app.py <PATH_TO_CLIENT_SECRET> <PROJECT_NAME>
```

If you don't need to save the logs, you can turn it off by changing `logSave` to `false` in `src/App.svelte`.

```javascript
...

let modelChecking = false;

let userId = '';

const logSave = false;
// const logSave = true;

const logSaveUrl = uri => `http://127.0.0.1:8000${uri}`;

const updateLogs = async (info) => {
    if (!logSave) {

...
```

# FIX: Vega-Lite & Semver
Whenever you clone this repo, access `./node_modules/semver/ranges` directory and open `outside.js` and `subset.js`.
Comment out line 3 of each file (which is `const { ANY } = Comparator`).
Then, add `const ANY = Symbol('SemVer ANY')` below line 3.
This is (presumably) due to async error while loading Comparator component of Semver with `require` function.

Or, simply run the following script at the `exploratory_modeling` directory
```
interface > sh scripts/semverFix.sh
```