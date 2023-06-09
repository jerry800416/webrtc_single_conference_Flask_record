# coding=utf-8
# import cv2
import numpy as np
from moviepy.editor import VideoFileClip, clips_array, AudioFileClip, CompositeAudioClip
import subprocess
import os,time,datetime


def mergeVideo(file1,file2,ouput):
    '''
    '''
    try:
        clip1 = VideoFileClip(file1).margin(5)
        clip2 = VideoFileClip(file2).margin(5)
        final_clip = clips_array([[clip1, clip2],])
        final_clip.resize(width=480).write_videofile(ouput)
    except Exception as e :
        return False
    return True


def mergeAudio(file1,file2,ouput):
    '''
    '''
    try:    
        try:
            clip1 = VideoFileClip(file1).audio
            clip2 = VideoFileClip(file2).audio
        except:
            clip1 = AudioFileClip(file1)
            clip2 = AudioFileClip(file2)
        new_audioclip = CompositeAudioClip([clip1.volumex(0.5),clip2.volumex(0.5)])
        new_audioclip.write_audiofile(ouput,44100)
    except Exception as e:
        return False
    return True


def webm2Mp4(file,result):
    cmd = 'ffmpeg -i {} -c:v copy {}'.format(file,result)
    x = subprocess.call(cmd,shell=True)

    if x == 0 : 
        return True
    else:
        os.remove(result)
        cmd = 'ffmpeg -i {} {}'.format(file,result)
        x = subprocess.call(cmd,shell=True)
        if x == 0 :
            return True
    return False


def go2Log(log_path, e):
    '''
    write info to log
    '''
    time = datetime.datetime.now()
    with open(log_path, 'a', newline='') as f:
        f.write('{} :{}\n'.format(time.strftime("%Y-%m-%d %H:%M:%S"), str(e)))


def flipTime(file,date):
    '''
    '''
    filetime = time.strftime('%Y-%m-%d', time.localtime(os.stat(file).st_ctime))
    if date != filetime :
        return False
    return True


# def mergeVideo_noaudio(file1,file2,ouput):
#     '''
#     '''
#     # set video 
#     reader1 = cv2.VideoCapture(file1)
#     reader2 = cv2.VideoCapture(file2)
#     width = int(reader1.get(cv2.CAP_PROP_FRAME_WIDTH))
#     height = int(reader1.get(cv2.CAP_PROP_FRAME_HEIGHT))
#     writer = cv2.VideoWriter(ouput,
#                 # cv2.VideoWriter_fourcc('I', '4', '2', '0'),
#                 cv2.VideoWriter_fourcc('M', 'P', '4', 'V'),
#                 30, # fps
#                 (width*2, height)) # resolution

#     if reader1.isOpened() and reader2.isOpened() :
#         more1,more2 = True,True
#         while more1 == True and more2 == True :
#             more1, frame1 = reader1.read()
#             more2, frame2 = reader2.read()
#             if more1 and more2 :
#                 frame1 = cv2.resize(frame1, (width, height))
#                 frame2 = cv2.resize(frame2, (width, height))
#                 img = np.hstack((frame1, frame2))
#                 cv2.waitKey(1)
#                 writer.write(img)
#             else :
#                 break
#     else :
#         print('video error')

#     writer.release()
#     reader1.release()
#     reader2.release()
#     cv2.destroyAllWindows()



if __name__ == '__main__':

    # recordpath = r"D:\\WebSite\\ITTS-EP-FRONTSITE\\wwwroot\\RecordUpload\\"
    recordpath = r"D:\\webrtc_single_conference_Flask_record\\record\\"
    record_list = os.listdir(recordpath)
    yesterday = str(datetime.date.today()-datetime.timedelta(days=4))

    for i in record_list:
        try:
            inputfilelist = os.listdir(recordpath+i)
            if len(inputfilelist)== 2 and flipTime(recordpath+i,yesterday) == True:
                file1 = recordpath+i+'\\'+ inputfilelist[0]
                file2 = recordpath+i+'\\'+ inputfilelist[1]
                
                output1 = recordpath+i+'\\0.mp4'
                output2 = recordpath+i+'\\1.mp4'
                result = recordpath+i+'\\{}.mp3'.format(i)

                if webm2Mp4(file1,output1) == True and webm2Mp4(file2,output2) == True :
                    if mergeAudio(output1,output2,result) == True :
                        os.remove(output1)
                        os.remove(output2)
                        go2Log("./mergelog","{} merge success".format(i))
                    else :
                        os.remove(output1)
                        os.remove(output2)
                        go2Log("./mergelog","{} merge failed".format(i))
                else :
                    go2Log("./mergelog","{} conversion failed".format(i))
            elif len(inputfilelist)== 3 and (i+'.mp3' in inputfilelist):
                pass
            else :
                go2Log("./mergelog","{} ERROR".format(i))
        except Exception as e :
            print(e)
                
    go2Log("./mergelog","Done")




        # elif len(inputfilelist)== 4 and ('merge.mp3' not in inputfilelist):
        #     output1 = recordpath+i+'\\0.mp4'
        #     output2 = recordpath+i+'\\1.mp4'
        #     result = recordpath+i+'\\merge.mp3'
        #     if mergeAudio(output1,output2,result) == True :
        #         print(i,"merge success")
        #     else :
        #         print(i,"merge failed")

        # elif len(inputfilelist) < 2 and ('merge.mp3' not in inputfilelist):
        #     print(i,"File corruption")
        # elif len(inputfilelist)== 5 and ('merge.mp3' in inputfilelist):
        #     print(i," has been completed")
        # else:
        #      print(i,"unknow error")
