# webrtc single conference Flask with record
<br>
this is webrtc video/audio conference example,used flask Signaling server and add record video/audio function.<br>
warining : recording function can record both clinet video and sound,but merge function only merge audio because video is too resource intensive.<br><br>

1. app.py => server used sockitIO to control all clinet<br>
2. index.html => templete html<br>
3. static/client.py => webrtc js for client<br>
4. record file => record file<br>
5. mergevideo.py => merge video/audio and catch audio from record file<br>
6. source file => ffmpeg Installation file<br><br>

## base 
1. system : Windows 10 <br>
2. Python version : 3.6 <br>
3. chrome version : 87.0.4280.88<br><br>

## how to use
1. cmd : pip install -r requirements.txt<br>
2. unzip ffmpeg-2020-12-20-git-ab6a56773f-full_build.7z and install it on Root directory<br>
2. cmd : python app.py<br>
3. open browser and enter url: localhost:3000<br>
4. if you want to merge record audio, cmd : python mergevideo.py<br>
4. enjoy it<br><br>

## history

#### 20201228 update
1. 新增每10秒自動側錄回server，但在server端合成時只合成聲音，影片太耗費資源<br>
2. 新增roomid和mode顯示在網址列功能，只需要網址列打上這兩個參數就可以直接進入房間,ex: http://localhost:3000/?mode=3&room=test<br>