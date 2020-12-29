# coding=utf-8
from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room
# import uuid
import os,time
from datetime import datetime


app = Flask(__name__, template_folder='E:\work\webrtc\singleWebconference1.0.0\\')
app.config["DEBUG"] = True
# app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app,cors_allowed_origins='*')


@app.route('/')
def index():
    return render_template('./index.html')


@socketio.on('join')
def creatOrJoin(roomid):
    # print('\n'.join(['%s:%s' % item for item in socketio.__dict__.items()]))
    try:
    # catch people num in the room ,if  room not be created ,set num = 0
        how_many_people = len(socketio.sockio_mw.engineio_app.manager.rooms['/'][str(roomid)])
        
    except :
        how_many_people = 0
    # detec how many people in room ,if no person ,creat room
    if how_many_people == 0 :
        join_room(roomid)
        emit('room_created', roomid)
    # if one person in the room ,join room
    elif how_many_people == 1:
        join_room(roomid)
        emit('room_joined', roomid)
    # if two people in the room ,return full room info
    else :
        emit('full_room', roomid)


@socketio.on('leave')
def leaveRoom(roomid):
    leave_room(roomid)
    emit('close_room',broadcast=True, include_self=False,room=roomid)
    close_room(roomid)


@socketio.on('start_call')
def startCall(roomid):
    print('Broadcasting start_call event to peers in room {}'.format(roomid))
    emit('start_call',broadcast=True, include_self=False,room=roomid)


@socketio.on('webrtc_offer')
def webrtcOffer(event):
    print('Broadcasting webrtc_offer event to peers in room {}'.format(event['roomid']))
    emit('webrtc_offer',event['sdp'],broadcast=True, include_self=False,room=event['roomid'])


@socketio.on('webrtc_answer')
def webrtcAnswer(event):
    print('Broadcasting webrtc_answer event to peers in room {}'.format(event['roomid']))
    emit('webrtc_answer',event['sdp'],broadcast=True, include_self=False,room=event['roomid'])


@socketio.on('webrtc_ice_candidate')
def webrtcIceCandidate(event):
    print('Broadcasting webrtc_ice_candidate event to peers in room {}'.format(event['roomid']))
    emit('webrtc_ice_candidate',event,broadcast=True, include_self=False,room=event['roomid'])


@socketio.on('upload_blob')
def webrtcuploadblob(event):
    roomid = event[1]
    clientid = event[2]
    if roomid not in os.listdir('./record/'):
        os.mkdir('./record/{}'.format(roomid))

    with open('./record/{}/{}.webm'.format(roomid,clientid),'ab') as f:
            if event[0] != [0]:
                f.write(event[0])

    if event[3] == 0:
        emit('transfer_complete')

    


if __name__ == '__main__':
    socketio.run(app, debug=True, host='127.0.0.1', port=3000)
