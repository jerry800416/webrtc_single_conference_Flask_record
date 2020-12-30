// DOM elements.
const roomselectioncontainer = document.getElementById('room-selection-container')
const roominput = document.getElementById('room-input')
const connectbtn = document.getElementById('connect-button')
const disconnectbtn = document.getElementById('disconnect-button')
const sharescreen = document.getElementById('share-screen')
const hidelocalbox = document.getElementById('hide-localbox')
const videochatcontainer = document.getElementById('video-chat-container')
const localvideocomponent = document.getElementById('local-video')
const remotevideocomponent = document.getElementById('remote-video')
const socket = io()
const senders = []
// free public stun servers(by google) ,but no turn server.
const iceservers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {urls: 'stun:stun.service.mozilla.com' },
  ],
}


// initial recoder global variable
var chunks = [];
var mediarecorder
// record audio or video
var blob
// control webcam and audio
var mediaconstraints
// var for mode video or audio 
var mode = 0
// var audioURL
var recoder


let localstream
let remotestream
let sharestream
let isroomcreator
// Connection between the local device and the remote peer.
let rtcpeerconnection
let roomid
let clientid


// -------------------------set element event binding-------------------------------


// click button event binding function
connectbtn.addEventListener('click', () => {
  try{
    if (mode === 0){
      mode = parseInt(document.querySelector('input[name="location"]:checked').value);
    }
    if(mode === 1){
      mediaconstraints = {audio: true,video: false}
    }else if(mode === 2){
      mediaconstraints = {
        audio: false,
        video: {
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: {max: 30}
        }
      }
    }
    else if(mode === 3){
      mediaconstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
      },video: {
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: {max: 30}
        }
      }
    }
    else{
      alert('plz check your mode')
    }
    joinRoom(roominput.value);
  }catch (error) {
    alert('plz check your mode')
  }
})


// click button event binding function
disconnectbtn.addEventListener('click', () => {
  leaveRoom(roominput.value)
})


// click button event binding function
sharescreen.addEventListener('click', () => {
  if(sharescreen.value == "0"){
    startShareScreen(mediaconstraints)
    sharescreen.value = "1"
    sharescreen.innerHTML = "stop share"
  }else if(sharescreen.value == "1"){
    stopShareScreen(mediaconstraints)
    sharescreen.value = "0"
    sharescreen.innerHTML = "share screen"
  }
})


// click button event binding function
hidelocalbox.addEventListener('click', () => {
  if(hidelocalbox.value == "0"){
    localvideocomponent.srcObject = undefined;
    hidelocalbox.value = "1"
    hidelocalbox.innerHTML = "show localbox"
  }else if(hidelocalbox.value == "1"){
    if(sharescreen.value == "0"){
      localvideocomponent.srcObject = localstream;
    }else if(sharescreen.value == "1"){
      localvideocomponent.srcObject = sharestream;
    }
    hidelocalbox.value = "0"
    hidelocalbox.innerHTML = "hide localbox"
  }
})


// before close window or reload page warning
window.addEventListener("beforeunload", function(event) {
  event.returnValue = ''
})


// close window or reload page will disconnect room
window.addEventListener("unload", function(event) {
  leaveRoom(roominput.value)
})


// -------------------------set socket event -------------------------------

// click button > socket created room event callbacks
socket.on('room_created', async (event) => {
  console.log('Socket event callback: room_created')
  console.log("roomURL: ",location.href.split('?')[0]+'?mode='+mode+"&room="+roomid)
  // get user local camera streams
  await setLocalStream(mediaconstraints)
  isroomcreator = true
})


// click button >  event callbacks join room
socket.on('room_joined', async () => {
  console.log('Socket event callback: room_joined')
  // get user local camera streams
  await setLocalStream(mediaconstraints)
  // start connect 
  socket.emit('start_call', roomid)
})


// click button > event callbacks room people fulled
socket.on('full_room', () => {
  console.log('Socket event callback: full_room')
  alert('The room is full, please try another one')
  leaveVideoConference()
})


socket.on('start_call', async () => {
  console.log('Socket event callback: start_call')
  // if roomcreator is true : means this room no person 
  if (isroomcreator) {
    // creat new peerconnect ,and use ice server information(stun or turn server)
    rtcpeerconnection = new RTCPeerConnection(iceservers)
    addLocalTracks(rtcpeerconnection)
    startRecord()
    openBtn()
    // setting remote stream 
    rtcpeerconnection.ontrack = setRemoteStream
    // icecandidate(ICE) event : find shortest path
    rtcpeerconnection.onicecandidate = sendIceCandidate
    await createOffer(rtcpeerconnection)
  }
})


socket.on('webrtc_offer', async (event) => {
  console.log('Socket event callback: webrtc_offer')
  // if roomcreator is false : means this room has person 
  if (!isroomcreator) {
    // creat new peerconnect ,and use ice server information(stun or turn server)
    rtcpeerconnection = new RTCPeerConnection(iceservers)
    addLocalTracks(rtcpeerconnection)
    startRecord()
    openBtn()
    rtcpeerconnection.ontrack = setRemoteStream
    rtcpeerconnection.onicecandidate = sendIceCandidate
    // RTCSessionDescription : return our info to remote computer
    rtcpeerconnection.setRemoteDescription(new RTCSessionDescription(event))
    await createAnswer(rtcpeerconnection)
  }
})


socket.on('webrtc_answer', (event) => {
  console.log('Socket event callback: webrtc_answer')
  rtcpeerconnection.setRemoteDescription(new RTCSessionDescription(event))
})


socket.on('webrtc_ice_candidate', (event) => {
  console.log('Socket event callback: webrtc_ice_candidate')
  // ICE candidate configuration.
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  })
  rtcpeerconnection.addIceCandidate(candidate)
})


socket.on('close_room', async () => {
  stopRecord()
  leaveVideoConference()
  alert('your partner has left , plz enter new room creat another conversation');
  alert('WARNING!! :Plz wait for the transfer to complete before closing this page!!');
})


socket.on('transfer_complete', async () => {
  mode = 0
  roomid,clientid,recoder,mediarecorder = undefined,undefined,undefined,undefined
  chunks = [];
  alert('transfer record complete!');
})


// -------------------------set logic function-------------------------------

// this function into room and send room id
function joinRoom(room) {
  if (room === '') {
    alert('Please enter a room ID')
  } else {
    roomid = room
    clientid = UUID()
    console.log("your clientID:"+clientid)
    socket.emit('join', room)
    showVideoConference()
  }
}


// this function to leave room 
function leaveRoom(room) {
  if (room === '') {
    alert('no room number')
  } else {
    roomid = room
    socket.emit('leave', room)
    // socket.emit('upload_record',{'':})
    stopRecord()
    leaveVideoConference()
    alert('video coference closed, if you need new coversation, plz enter new room number');
    alert('WARNING :plz wait for the transfer to complete before closing this page!!');
  }
}


// this function to start record
function startRecord(){
  // recoder stream
  mediarecorder = new MediaRecorder(localstream)
  // set stream mode (video or audio) 
  if(mode === 1){
    mediarecorder.mimeType = 'audio/webm; codecs=opus';
    console.log("recorder started");

  }else if(mode === 2 || mode === 3){
    mediarecorder.mimeType = 'video/webm; codecs=h264';
    // mediarecorder.audioChannels = 2;
    console.log("recorder started");
  }else{
    console.log('can\'t recorde, plz check your mode')
  }
  // set 10 sec trigger dataavailable and cut blob
  mediarecorder.start(10000);
  // event function
  mediarecorder.ondataavailable = function(e) {
    chunks.push(e.data);
    socket.emit('upload_blob',[chunks.shift(),roomid,clientid,1])
    console.log('upload record !!')
  }
}


// this function to stop record
function stopRecord(){
  if(mediarecorder != undefined){
    mediarecorder.stop()
    console.log("recorder stopped");
    var atlast = chunks.length
    console.log("there are",atlast,"data need upload")
    if(atlast != 0){
      for (let i = 0; i < atlast; i++) {
        if(i == atlast-1){
          socket.emit('upload_blob',[chunks[i],roomid,clientid,0])
        }else{
          socket.emit('upload_blob',[chunks[i],roomid,clientid,1])
        }
      }
    }else{
      socket.emit('upload_blob',[[0],roomid,clientid,0])
    }
  }
    // blob = new Blob(chunks, { 'type' : 'audio/webm codecs=opus' });
    // var audioURL = window.URL.createObjectURL(blob);
}


// start sharescreen function
async function startShareScreen(mediaconstraints){
  var displayconstraints =  mediaconstraints
  displayconstraints.video = {width: { max: 1920 },height: { max: 1080 },frameRate: {max: 30},cursor: "always"}
  displayconstraints.audio = false
  try {
    stream = await navigator.mediaDevices.getDisplayMedia(displayconstraints)
    sharestream = stream
    localvideocomponent.srcObject = sharestream
    senders.find(sender => sender.track.kind === 'video').replaceTrack(sharestream.getTracks()[0]);
  } catch (error) {
    console.error('Could not get user screem', error)
    sharescreen.value = "0"
    sharescreen.innerHTML = "share screen"
  }
}

// stop sharescreen function
async function stopShareScreen(){
  senders.find(sender => sender.track.kind === 'video').replaceTrack(localstream.getTracks().find(track => track.kind === 'video'));
  sharestream.getTracks()[0].stop()
  sharestream = undefined;
  localvideocomponent.srcObject = localstream
}


// this function cancle video display none if into room and get local camera stream
function showVideoConference() {
  roomselectioncontainer.style = 'display: none'
  videochatcontainer.style = 'display: block'
  disconnectbtn.disabled = false;
  disconnectbtn.innerHTML = 'leave Room';
}


// leave video conference
function leaveVideoConference() {
  // hide video div and show choose page
  roomselectioncontainer.style = 'display: block'
  videochatcontainer.style = 'display: none'

  // if share screem not stop ,clear variable and stop it.
  if(sharestream != undefined){
    stopShareScreen()
    console.log(123)
  }
  // stop localstream 
  localstream.getTracks()[0].stop();
  // close rtc peer connection
  if(rtcpeerconnection != undefined){
    rtcpeerconnection.getSenders().forEach(function(sender) {
      sender.track.stop();
    });
    rtcpeerconnection.close();
  }
  // close button
  closeBtn()
  // reset const
  senders.length = 0;
  // reset variable
  localstream,remotestream,isroomcreator,mediaconstraints,rtcpeerconnection,isroomcreator = undefined,undefined,undefined,undefined,undefined,undefined
}


// this function get user camera stream(local)
async function setLocalStream(mediaconstraints) {
  let stream
  try {
    // if calback ,show stream and audio
    stream = await navigator.mediaDevices.getUserMedia(mediaconstraints)

  } catch (error) {
    console.error('Could not get user media', error)
    alert('error,check your microphone and webcame')
    leaveVideoConference()
  }
  localstream = stream
  localvideocomponent.srcObject = stream
}


// add local stream to webrtc track
function addLocalTracks(rtcpeerconnection) {
  localstream.getTracks().forEach(
    // (track) => {rtcpeerconnection.addTrack(track, localstream)},
    track => senders.push(rtcpeerconnection.addTrack(track, localstream))
    )
}


async function createOffer(rtcpeerconnection) {
  let sessionDescription
  try {
    sessionDescription = await rtcpeerconnection.createOffer()
    rtcpeerconnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_offer', {
    type: 'webrtc_offer',
    sdp: sessionDescription,
    roomid,
  })
}


async function createAnswer(rtcpeerconnection) {
  let sessionDescription
  try {
    sessionDescription = await rtcpeerconnection.createAnswer()
    rtcpeerconnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_answer', {
    type: 'webrtc_answer',
    sdp: sessionDescription,
    roomid,
  })
}


// set remote stream 
function setRemoteStream(event) {
  remotevideocomponent.srcObject = event.streams[0]
  remotestream = event.stream
}


// send candidate event to server 
function sendIceCandidate(event) {
  if (event.candidate) {
    socket.emit('webrtc_ice_candidate', {
      roomid,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    })
  }
}

// open button
function openBtn(){
  if( mode == 2 || mode == 3){
    sharescreen.disabled = false;
    hidelocalbox.disabled = false
  }else if(mode == 1){
    sharescreen.disabled = true;
    hidelocalbox.disabled = true
  }
}

// close button
function closeBtn(){
  sharescreen.disabled = true;
  sharescreen.value = "0"
  sharescreen.innerHTML = "share screen"
  hidelocalbox.disabled = true
  hidelocalbox.value = "0"
  hidelocalbox.innerHTML = "hide localbox"
  disconnectbtn.disabled = true;
  disconnectbtn.innerHTML = 'wait for connect....';
}

// uuid function
function UUID() {
  var d = Date.now();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
    //use high-precision timer if available
    d += performance.now();
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}




// used url join room or creat room
// http://localhost:3000/?mode=1&room=500
if(location.href.indexOf('?')!=-1){
  var datalist = location.href.split('?')[1].split('&');
  mode = parseInt(datalist[0].split('=')[1])
  roominput.value = datalist[1].split('=')[1]
  connectbtn.click()
}