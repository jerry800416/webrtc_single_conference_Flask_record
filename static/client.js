// DOM elements.
const roomSelectionContainer = document.getElementById('room-selection-container')
const roomInput = document.getElementById('room-input')
const connectButton = document.getElementById('connect-button')
const disConnectButton = document.getElementById('disconnect-button')
const videoChatContainer = document.getElementById('video-chat-container')
const localVideoComponent = document.getElementById('local-video')
const remoteVideoComponent = document.getElementById('remote-video')
const socket = io()


// initial recoder global variable
var chunks = [];
var mediaRecorder
// recorde audio or video
var blob
// control webcam and audio
var mediaConstraints
// var for mode video or audio 
var mode = 0
// var audioURL
var recoder


let localStream
let remoteStream
let isRoomCreator
// Connection between the local device and the remote peer.
let rtcPeerConnection
let roomId
let clientid

// free public stun servers(by google) ,but no turn server.
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {urls: 'stun:stun.service.mozilla.com' },
  ],
}

// -------------------------set element event binding-------------------------------


// click button event binding function
connectButton.addEventListener('click', () => {
  try{
    if (mode === 0){
      mode = parseInt(document.querySelector('input[name="location"]:checked').value);
    }
    if(mode === 1){
      mediaConstraints = {audio: true,video: false}
    }else if(mode === 2){
      mediaConstraints = {audio: false,video: {width: { max: 1280 },height: { max: 720 }}}
    }
    else if(mode === 3){
      mediaConstraints = {audio: true,video: {width: { max: 1280 },height: { max: 720 }}}
    }
    else{
      alert('plz check your mode')
    }
    joinRoom(roomInput.value);
  }catch (error) {
    alert('plz check your mode')
  }
})


// click button event binding function
disConnectButton.addEventListener('click', () => {
  leaveRoom(roomInput.value)
})


// before close window or reload page warning
window.addEventListener("beforeunload", function(event) {
  event.returnValue = ''
})


// close window or reload page will disconnect room
window.addEventListener("unload", function(event) {
  leaveRoom(roomInput.value)

})


//index.aspx?mode=1&room=500
if(location.href.indexOf('?')!=-1){
  var datalist = location.href.split('?')[1].split('&');
  mode = parseInt(datalist[0].split('=')[1])
  roomInput.value = datalist[1].split('=')[1]
  connectButton.click()
}

// -------------------------set socket event -------------------------------

// click button > socket created room event callbacks
socket.on('room_created', async (event) => {
  console.log('Socket event callback: room_created')
  console.log("roomURL: ",location.href.split('?')[0]+'?mode='+mode+"&room="+roomId)
  // get user local camera streams
  await setLocalStream(mediaConstraints)
  isRoomCreator = true
})


// click button >  event callbacks join room
socket.on('room_joined', async () => {
  console.log('Socket event callback: room_joined')
  // get user local camera streams
  await setLocalStream(mediaConstraints)
  // start connect 
  socket.emit('start_call', roomId)
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
  if (isRoomCreator) {
    // creat new peerconnect ,and use ice server information(stun or turn server)
    rtcPeerConnection = new RTCPeerConnection(iceServers)
    addLocalTracks(rtcPeerConnection)
    // setting remote stream 
    rtcPeerConnection.ontrack = setRemoteStream
    // icecandidate(ICE) event : find shortest path
    rtcPeerConnection.onicecandidate = sendIceCandidate
    await createOffer(rtcPeerConnection)
  }
})


socket.on('webrtc_offer', async (event) => {
  console.log('Socket event callback: webrtc_offer')
  // if roomcreator is false : means this room has person 
  if (!isRoomCreator) {
    // creat new peerconnect ,and use ice server information(stun or turn server)
    rtcPeerConnection = new RTCPeerConnection(iceServers)
    addLocalTracks(rtcPeerConnection)
    rtcPeerConnection.ontrack = setRemoteStream
    rtcPeerConnection.onicecandidate = sendIceCandidate
    // RTCSessionDescription : return our info to remote computer
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
    await createAnswer(rtcPeerConnection)
  }
})


socket.on('webrtc_answer', (event) => {
  console.log('Socket event callback: webrtc_answer')
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})


socket.on('webrtc_ice_candidate', (event) => {
  console.log('Socket event callback: webrtc_ice_candidate')
  // ICE candidate configuration.
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  })
  rtcPeerConnection.addIceCandidate(candidate)
  disConnectButton.disabled = false;
  disConnectButton.innerHTML = 'leave Room';
})


socket.on('close_room', async () => {
  leaveVideoConference()
  alert('your partner has left , plz enter new room creat another conversation');
  alert('WARNING!! :Plz wait for the transfer to complete before closing this page!!');
})


socket.on('transfer_complete', async () => {
  // clearInterval(recoder)
  mode = 0
  roomId,clientid,recoder,mediaRecorder = null,null,null,null
  chunks = [];
  alert('transfer record complete!');
})

// -------------------------set logic function-------------------------------

// this function into room and send room id
function joinRoom(room) {
  if (room === '') {
    alert('Please enter a room ID')
  } else {
    roomId = room
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
    roomId = room
    socket.emit('leave', room)
    // socket.emit('upload_record',{'':})
    leaveVideoConference()
    alert('video coference closed, if you need new coversation, plz enter new room number');
    alert('WARNING :plz wait for the transfer to complete before closing this page!!');
  }
}


// this function to stop recorde 
function stopRecord(){
  mediaRecorder.stop()
  console.log("recorder stopped");
  var atlast = chunks.length
  console.log("there are",atlast,"data need upload")
  if(atlast != 0){
    for (let i = 0; i < atlast; i++) {
      if(i == atlast-1){
        socket.emit('upload_blob',[chunks[i],roomId,clientid,0])
      }else{
        socket.emit('upload_blob',[chunks[i],roomId,clientid,1])
      }
    }
  }else{
    socket.emit('upload_blob',[[0],roomId,clientid,0])
  }
    // blob = new Blob(chunks, { 'type' : 'audio/webm codecs=opus' });
    // var audioURL = window.URL.createObjectURL(blob);
}


// this function cancle video display none if into room and get local camera stream
function showVideoConference() {
  roomSelectionContainer.style = 'display: none'
  videoChatContainer.style = 'display: block'
}


// leave video conference
function leaveVideoConference() {
  roomSelectionContainer.style = 'display: block'
  videoChatContainer.style = 'display: none'
  // stop localstream and close webcam(use on chrome on windows)
  rtcPeerConnection.getSenders().forEach(function(sender) {
    sender.track.stop();
  });
  // stop localstream and close webcam(used on chrome on android)
  localStream.getTracks()[0].stop();

  // disable button
  disConnectButton.disabled = true;
  disConnectButton.innerHTML = 'wait for connect....';
  stopRecord()
  // reset variable
  localStream = null;
  remoteStream = null;
  isRoomCreator = null;
  mediaConstraints = null;
  // close peer connection
  rtcPeerConnection.close()
  rtcPeerConnection = null;
}


// this function get user camera stream(local)
async function setLocalStream(mediaConstraints) {
  let stream
  try {
    // if calback ,show stream and audio
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    // stream = await navigator.mediaDevices.getDisplayMedia(mediaConstraints)

  } catch (error) {
    console.error('Could not get user media', error)
    alert('error,check your microphone and webcame')
    leaveVideoConference()
  }
  localStream = stream
  localVideoComponent.srcObject = stream
}


// add local stream to webrtc track
function addLocalTracks(rtcPeerConnection) {
  localStream.getTracks().forEach((track) => {
    rtcPeerConnection.addTrack(track, localStream)
  })
  // recoder stream
  mediaRecorder = new MediaRecorder(localStream)
  // set stream mode (video or audio) 
  if(mode === 1){
    mediaRecorder.mimeType = 'audio/webm; codecs=opus';
    console.log("recorder started");

  }else if(mode === 2 || mode === 3){
    mediaRecorder.mimeType = 'video/webm; codecs=h264';
    // mediaRecorder.audioChannels = 2;
    console.log("recorder started");
  }else{
    console.log('can\'t recorde, plz check your mode')
  }
  // set 10 sec trigger dataavailable and cut blob
  mediaRecorder.start(10000);
  // event function
  mediaRecorder.ondataavailable = function(e) {
    chunks.push(e.data);
    socket.emit('upload_blob',[chunks.shift(),roomId,clientid,1])
    console.log('upload record !!')
  }
}


async function createOffer(rtcPeerConnection) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createOffer()
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_offer', {
    type: 'webrtc_offer',
    sdp: sessionDescription,
    roomId,
  })
}


async function createAnswer(rtcPeerConnection) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createAnswer()
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_answer', {
    type: 'webrtc_answer',
    sdp: sessionDescription,
    roomId,
  })
}


// set remote stream 
function setRemoteStream(event) {
  remoteVideoComponent.srcObject = event.streams[0]
  remoteStream = event.stream
}


// send candidate event to server 
function sendIceCandidate(event) {
  if (event.candidate) {
    socket.emit('webrtc_ice_candidate', {
      roomId,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    })
  }
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

