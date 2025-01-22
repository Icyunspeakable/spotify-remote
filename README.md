<div id="header" align="center">
  <img src="https://play-lh.googleusercontent.com/eN0IexSzxpUDMfFtm-OyM-nNs44Y74Q3k51bxAMhTvrTnuA4OGnTi_fodN4cl-XxDQc" width="250">
</a>
<h1>
  Hello, Welcome to page of my Spotify remote

  ---
  
  This tool allows you to display the current song you are listening to
<img src="https://cdn.discordapp.com/attachments/776228439006248960/1331761605867999332/image.png?ex=6792cb25&is=679179a5&hm=87fc24125fd54633f07136bd7b9181c85c57c1751d2f58846dc073cb9c494297&" align="center">
 
  
  <span>It also allows you to change the current song position, volume, play/pause, skip the song, play the previous song, etc...</span>

  This app also logs all the songs you have listened to in the console (log file coming soon)
</h1>
<div>
  <span>Let's take a look at the backend for this</span>
  <img src="https://cdn.discordapp.com/attachments/776228439006248960/1331762647883841586/image.png?ex=6792cc1e&is=67917a9e&hm=2176cfad1f4b2dabd1663906a177fdbc4b7bd622c4c425fd634af83ad5bae326&">

  <span>as you can see it grabs information from spotify such as</span>
  ---
  - The Song Name
  - The Song Artist
  - The Song's Cover Art
  - The Song's Position
  - The Users Spotify Volume
  - The Length of The Current Song 
  ---
</div>
<h2>Now, How does this all work???</h2>

---

By communicating with spotify's API and also communicating with itself (IN ENGLISH) via IPC

---

To use it you will need to download the entire repository, then install node, then install electron, after all of these steps (will release full build soon that has these built in) you will simply open the entire workspace in code and type 

npm start


and it will open up spotify login page (because it needs to link to specifically your spotify (this data is not stored anywhere and is only necessary for this app to be able to interact with the spotify player) then all you need to do is open spotify, select a song and hit play, then you can minimize spotify and use the remote (note that spotify premium is required for some of the functions to work)
