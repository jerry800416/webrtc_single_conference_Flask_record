# webrtc single conference Flask with record
<br>
this is webrtc video/audio conference example,used flask Signaling server and add record video/audio function.<br>
warining : recording function can record both clinet video and sound,but merge function only merge audio because video is too resource intensive.<br>
warining : this meeting room that can only accommodate two people.<br><br>


1. app.py => server used socketIO to control all clinets<br>
2. index.html => templete html<br>
3. static/client.py => webrtc js for client<br>
4. record folder => record folder<br>
5. mergevideo.py => merge video/audio and catch audio from record folder<br>
6. source folder => ffmpeg folder<br><br>

## base 
1. system : Windows 10 professional<br>
2. Python version : 3.6 <br>
3. chrome version : 87.0.4280.88<br><br>

## how to use
1. cmd : pip install -r requirements.txt<br>
2. unzip ffmpeg-2020-12-20-git-ab6a56773f-full_build.7z and install it on Root directory<br>
3. cmd : python app.py<br>
4. creat a folder in the root directory,folder name: record
5. add your_path/ffmpeg/bin to your envirment path
6. open browser and enter url: localhost:3000<br>
7. if you want to merge record audio, cmd : python mergevideo.py<br>
8. enjoy it!<br><br>

## history

#### 20201230 update
1. 新增framerate設定為maxs30<br><br>

#### 20201229 update
1. 新增分享螢幕畫面功能<br>
2. 新增註解以及變數名稱規範化<br>
3. 新增縮小己方錄像功能，避免擋住畫面<br><br>

#### 20201228 update
1. 新增每10秒自動側錄回server，對話雙方各自只會側錄己方的影片和聲音，上傳server之後才會轉檔以及合成，但在server端合成時只合成聲音，影片太耗費資源<br>
2. 新增roomid和mode顯示在網址列功能，只需要網址列打上這兩個參數就可以直接進入房間,ex: http://localhost:3000/?mode=3&room=test<br><br>

#### 20230609 update
1. 環境建置已符合新電腦

# **Coturn server 架設(ubuntu 18.04) **
<br>

###  **(1)	 安裝coturn server **
1.	更新存儲庫
`sudo apt-get update`
2.	安裝Coturn
`sudo apt-get install coturn`
3.	安裝完成後，coturn服務將自動啟動。我們需要停止它以完成配置：
`sudo systemctl stop coturn`
4.	現在，我們將設置一個將運行Turnserver進程的用戶。該用戶將被添加到Turnserver的配置設置中：
`sudo adduser <turnadmin>`<br>
<font color=#FF0000>(為turnadmin設置密碼以完成該過程。不必使用turnadmin作為用戶。您可以設置任何用戶-新用戶或現有用戶)</font>
5.	現在，我們將turnadmin添加到該root組。這是必需的，因為在某些情況下，turnadmin進程無法訪問某些資源，否則將無法啟動。
`sudo usermod -a -G root <turnadmin>`<br>
<br>

### **(2)	申請免費域名(如果有自己的域可以跳過)**
1.	網址: https://www.noip.com/
2.	進入網址申請免費帳戶，免費帳戶最多可申請3組免費域名
3.	Hostname 打上你想設定的網址名稱，Record type 選DNS HOST(A)，Domain 選一組你自己順眼的，IPV4 Address 打上你的公用IP，然後點選creathostname <br>
<font color=#FF0000>注意 : 免費帳戶申請的hostname 只有30天有效期，過期必須再次申請</font>

![](http://10.10.19.21:888/server/../Public/Uploads/2021-02-22/603369a9edc69.png)
<br>

### (3)	 設置SSL證書
1.	如果僅計劃將Coturn用作STUN服務器，則此步驟是可選的。如果您也想將其實現為TURN服務器，則需要SSL。
`sudo apt-get install certbot`
2.	如果已經在運行Web服務器，請先停止該服務。然後為certbot運行以下命令以啟動臨時Web服務器以生成證書：
`sudo certbot certonly --standalone`
3.	上述命令會要求輸入你的email 和域名 , email隨便打一組 域名就要使用上面步驟申請的域名
4.	密鑰生成過程結束後，您將在/etc/letsencrypt/live/<domain>中找到證書文件，其中<domain>是服務器的域。
<br>

### (4)	配置coturn server
1.	新增coturn 資料夾存放key文件
`sudo mkdir /etc/coturn`
`cd /etc/coturn`
2.	複製兩個證書文件，cert.pem,privkey.pem
`sudo cp /etc/letsencrypt/live/<domain>/cert.pem /etc/coturn`
`sudo cp /etc/letsencrypt/live/<domain>/privkey.pem /etc/coturn`
3.	備份config檔案
`sudo cp /etc/turnserver.conf /etc/turnserver.conf.bak`
4.	修改turnserver.conf
`sudo nano /etc/turnserver.conf`
5.	在turnserver.conf 最下面新增以下
```
listening-port=3478
tls-listening-port=5349
alt-listening-port=3479
alt-tls-listening-port=5350
external-ip=<your public ip>   # 這裡填上你的公用IP
fingerprint
lt-cred-mech
server-name=<domain>   # 這裡填上之前申請的域名
user=<turnadmin>:<turnpwd>    # 這裡填上你要使用的coturn帳號:密碼
realm=<domain>     # 這裡填上之前申請的域名
cert=/etc/turnserver/cert.pem
pkey=/etc/turnserver/privkey.pem
cipher-list="DEFAULT"
log-file=/var/log/turnserver.log
simple-log
verbose
TURNSERVER_ENABLED=1
```
6.	`sudo nano /etc/default/coturn` 將TURNSERVER_ENABLED=1註解打開
<br>

### (5)	 添加turnserver的管理員用戶
`sudo turnadmin -a -u <turnadmin> -r <domain> -p <turnpwd>`
<font color=#FF0000>注意 : <turnadmin>和<turnpwd>是之前步驟1-4設定的帳號和密碼，<domain>是步驟2申請的域名</font>
<br>

### (6)	 開始服務
1.	啟動Coturn服務器
`sudo systemctl start coturn`
2.	檢查狀態
`sudo systemctl status coturn`
3.	如果沒有錯誤，則應顯示類似以下內容：
```
coturn.service - coturn
Loaded: loaded (/usr/lib/systemd/system/coturn.service; disabled; vendor preset: disabled)
Active: active (running) since Sat 2020-05-30 09:46:00 UTC; 2 weeks 3 days ago
Docs: man:coturn(1)
man:turnadmin(1)
man:turnserver(1)
Process: 27244 ExecStart=/usr/bin/turnserver -o -c /etc/coturn/turnserver.conf --pidfile /run/coturn/turnserver.pid (code=exited, status=0/SUCCESS)
Main PID: 27245 (turnserver)
CGroup: /system.slice/coturn.service
└─27245 /usr/bin/turnserver -o -c /etc/coturn/turnserver.conf --pi…
```
<br>

### (7)	啟用防火牆
`sudo ufw allow 3478`
<font color=#FF0000>注意: 若是使用ssh連線遠端主機,必須先開啟22端口，避免防火牆打開將22端口禁用導致連線中斷</font>
`sudo ufw allow 22`
`sudo ufw enable`

若是架設伺服器在雲端VM上，須注意如下 :
1.	GCP VM目前實測無法使用，請注意
2.	Azure VM 可以使用，但需要多一個步驟，需在網路輸入和輸出新增規則如下:
輸入防火牆規則:
來源:Any,來源連接埠範圍:49157-65535,目的地連接埠範圍:3478,通訊協定:udp,動作:允許
輸出防火牆規則:
來源:Any,來源連接埠範圍:3478,目的地連接埠範圍: 49157-65535,通訊協定:udp,動作:允許
<br>

### (8)	 測試服務
1.	要檢查服務器是否正常運行，請使用免費工具：
TrickleICE：https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/ 
2.	對於STUN服務器，輸入為 stun:mysite.com:3478
3.	對於TURN服務器，輸入為 turn:mysite.com:3478，另外需輸入TURN username和TURN password (這是4-5設定的帳號和密碼)，按下gather candidates
4.	顯示為 done 代表測試成功，若很久才顯示 done 也是代表失敗，記得去 `/var/log/turnserver.log` 查看問題
5.	在你自己的webrtc 專案的js code 新增如下:
```
'iceServers': [
	{ url: 'stun:mysite.com:3478' },
	{
		url: 'turn:mysite.com,
		credential: 'turnpwd',
		username: 'turnadmin'
	}
]
```
<br>

**大功告成!!**
