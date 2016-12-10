# GDG PAIN - Frontend App

https://gdgpain.firebaseapp.com

### TODO
 - [ ] Event creation page (design)
 - [ ] Pushing new event to Firebase Database
 - [ ] File uploads? (for integrations, cover images, ...) - Firebase Storage
 - [ ] Integration with other services (Facebook, Meetup, ...) - creating connection and storing access tokens to our database
 - [ ] Custom service worker (not automatically generated) - for faster load times
 - [ ] Service connection page
 - [ ] Listing user chapters
 
### Technology stack
 - Polymer (v1)
 - ES2015
 
### Development

__Requirements__
 - Node.js (latest stable, v6+)
 - gulp (```npm install -g gulp```)
 - bower (```npm install -g bower```)
 
__Code style__
 - use spaces (2 for JS, 4 for HTML&CSS)
 - write in JavaScript Standard (link) - without semicolons
 - no unlocalized strings in the app UI
 - just look at the code around, keep with it ;)
 
__Setting up the environment__

Clone this repository & cd to it
```bash
git clone git@github.com:gdg-cee/pain-frontend.git

cd pain-frontend
```

Then install all dependencies
```bash
npm install

bower install
```

Now you are ready to develop, just start the local server
```bash
gulp serve
```

It wil automatically listen for changes you make to the code and reload your browser window

### Pull requests & contributions

If you developed a new feature, push it to your own branch a submit a Pull request. Wait for at least one review from other member of the PAIN team before merging.