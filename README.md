###### Leaflet-TrackPlayer 1.1.4 中文文档

> 一款基于 Leaflet 地图开发的轨迹巡航插件

![chrome_Qn8oM8VQ2s](https://gitee.com/xieqianstudent/picture/raw/master/chrome_Qn8oM8VQ2s.gif)

##### 使用示例

```javascript

	//创建trackPlayer插件对象
	let trackPlayer = new TrackPlayer()
	//初始化创建轨迹 返回轨迹进度步进数
	let {progressStep}= this.trackPlayer.init(L.Map map,Array<TimePointType > TimePointData)

```

##### 创建 TrackPlayer 插件实例对象

###### new TrackPlayer(Options)

###### **Options 类型 Object**

| 键名称     | 值类型                                 | 描述说明             |
| ---------- | -------------------------------------- | -------------------- |
| speed      | number （默认值 1）                    | 轨迹角色运动速度     |
| PassLine   | PassLineConfig （默认值参考下方类型）  | 已经过轨迹路线的配置 |
| TrackLine  | TrackLineConfig （默认值参考下方类型） | 总轨迹路线的配置     |
| MarkerIcon | L.icon 类型                            | 轨迹运动角色 ICON    |

###### PassLineConfig 类型 **Object**

| 键名称     | 值类型                        | 描述说明           |
| ---------- | ----------------------------- | ------------------ |
| lineColor  | string (默认值 #1afa29)       | 轨迹路线填充颜色   |
| arrowColor | string\|null (默认值 #FFFFFF) | 轨迹路线的箭头颜色 |
|            |                               |                    |

###### TrackLineConfig 类型 **Object**

| 键名称     | 值类型                        | 描述说明           |
| ---------- | ----------------------------- | ------------------ |
| lineColor  | string (默认值 #fff)          | 轨迹路线填充颜色   |
| arrowColor | string\|null (默认值 #000000) | 轨迹路线的箭头颜色 |
|            |                               |                    |

##### 调用方法示例

    	//调用trackPlayer插件方法
    	switch (action) {
    				case 'init':
        			//初始化trackPlayer 轨迹
    				let {progressStep}=trackPlayer.init(L.Map map,Array<TimePointType > TimePointData)
    
    				break;
                 	//更新轨迹运动速度
    				case 'speed':
    				trackPlayer.setSpeed(speed||300)
    				break;
    				case 'play':
    			 	//开始轨迹运动
    				trackPlayer.startTrack(progress)
    				break;
    				case  'pause':
                 	//暂停轨迹运行
    				trackPlayer.pauseTrack();
    				break;
    				case 'destroy':
                  	//销毁轨迹
    				trackPlayer.destroyTrack()
    				break;
    
    			}

###### 轨迹实例方法

| 方法名称     | 方法类型                                                     | 描述说明                                                     |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| init         | (map:L.map,TimePointData:Array<TimePointType>)=> InitBackDataType | 初始化轨迹方法 TimePointData:Array<TimePointType>为轨迹路线 JSON 数据 |
| setSpeed     | (speed:number\|null)=> void                                  | 设置轨迹角色运动速度                                         |
| addTrackData | (TimePointData:Array<TimePointType>)=>void                   | 添加轨迹数据                                                 |
| startTrack   | (progress:number\|null)=> void                               | 运行轨迹 (传入运动轨迹进度，轨迹将自动跳转到指定进度开始运动) <br />tips：注意传入的轨迹进度必须是插件返回的轨迹步进值得倍数。否则轨迹实际运行的效果将会混乱 |
| reStart      | ()=> void                                                    | 重置轨迹进度                                                 |
| pauseTrack   | ()=> void                                                    | 暂停轨迹运动                                                 |
| destroyTrack | ()=> void                                                    | 销毁轨迹<br />tips：销毁轨迹后需要重新 init 生成轨迹。       |
| on           | (EventType: TrackBackPlayerEvent, cb:Function)=>void         | 监听插件事件。EventType : 插件暴露的事件类型 ，cb: 触发事件的回调函数 |
| off          | (EventType: TrackBackPlayerEvent, cb:Function)=>void         | 解除指定插件事件。EventType : 插件暴露的事件类型 ，cb: 触发事件的回调函数 |

###### TrackBackPlayerEvent 类型 String 。 目前只暴露了 onProgressUpdate与onArriveTrackPoint 事件

| 方法类型           | 方法说明                                                     |
| ------------------ | ------------------------------------------------------------ |
| onProgressUpdate   | 轨迹进度更新触发事件。回调函数 接收 参数类型 **TrackInfo** 参考下文 |
| onArriveTrackPoint | 当轨迹进行到其中的一个轨迹坐标点时触发                       |

###### TrackInfo 类型 Object

| 键名称          | 值类型                       | 描述说明                                                           |
| --------------- | ---------------------------- | ------------------------------------------------------------------ |
| speed           | number                       | 轨迹角色运动速度                                                   |
| progress        | number                       | 当前轨迹所运行的进度                                               |
| progressStep    | number                       | 根据轨迹数组 JSON 计算出的每个轨迹点的步进值                       |
| move_status     | 'stop'\|'moving'             | 当前轨迹角色状态                                                   |
| track_status    | 'unStart'\|'progress'\|'end' | 当前轨迹状态                                                       |
| MOVE_MARKER     | L.marker                     | 轨迹角色实例                                                       |
| TRACK_PASS_LINE | L.polylineDecorator          | 插件 leaflet-polylinedecorator 注入的一个类 ，具体参考插件官网说明 |

#####

###### TimePointType 类型 Object 轨迹路线 JSON 数据

| 键名称 | 值类型      | 描述说明                                   |
| ------ | ----------- | ------------------------------------------ |
| lng    | number      | 轨迹点经度坐标                             |
| lat    | number      | 轨迹点纬度坐标                             |
| time   | Date String | 轨迹点记录时间 示例（2025/09/19 08:06:20） |

###### InitBackDataType 类型 Object

| 键名称       | 值类型 | 描述说明                           |
| ------------ | ------ | ---------------------------------- |
| progressStep | number | 平均每个轨迹点之间占总进度的步进值 |

##### TrackPlayer 实例属性

| 属性名称             | 属性类型                           | 描述说明                                                                                                                                  |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| \_Alive              |                                    | 插件是否被激活                                                                                                                            |
| \_map                |                                    | leaflet 地图实例                                                                                                                          |
| \_speed              |                                    | 速度: 标识上一个点移动到下一个点的速度为 300ms                                                                                            |
| \_TrackStatus        |                                    | 轨迹状态 unStart:未开始 progress:进行中 end:已结束                                                                                        |
| \_Track_Data         |                                    | 轨迹数据                                                                                                                                  |
| \_CurTrackData       |                                    | 当前行驶的轨迹角色 所处进度的轨迹数据                                                                                                     |
| \_PassMarkStatus     |                                    | 行驶的轨迹角色对象状态 stop:停止状态 moving:正在移动                                                                                      |
| \_PassMarker         | L.marker                           | 行驶的轨迹角色对象 L.marker 实例                                                                                                          |
| \_TrackLineDecorator | L.polylineDecorator                | 总轨迹路线 L.polylineDecorator 实例                                                                                                       |
| \_TrackLine          | L.Line                             | 总轨迹线 L.Line 实例                                                                                                                      |
| \_PassLineDecorator  | L.polylineDecorator                | 已行驶轨迹 L.polylineDecorator 实例                                                                                                       |
| \_PassLine           | L.Line                             | 已行驶轨迹线 L.Line 实例                                                                                                                  |
| \_TrackerLayerGroup  | L.LeafletGroup                     | 行驶轨迹图层                                                                                                                              |
| \_TrackProgress      |                                    | 轨迹总进度                                                                                                                                |
| \_TrackProgressStep  |                                    | 进度步进值                                                                                                                                |
| \_TrackAnimateTimer  |                                    | 轨迹运动动画 timer 对象                                                                                                                   |
| \_Options            |                                    | 插件初始化时可传入的配置项                                                                                                                |
| \_duration_unit      | ‘second’\|‘minute’\|‘hour’\|‘none’ | 根据轨迹 JSON 坐标点的相隔距离时间来设置。坐标点的时差越短就设置 second，越长设置 hour。如果想每段坐标点的路径的运行时间都一致则设置 none |

**Tips：**

1.若需要根据时间线跳转指定到轨迹的指定进度 分为三步

step1 找到所需要跳转到的轨迹占总轨迹数据的 Index 下标

step2 拿所需要跳转的指定轨迹下标值 \* 插件所返回的轨迹进度步进值 = 所跳转轨迹占总轨迹的进度

step3 调用 startTrack 方法传入所跳转的 轨迹点进度值 。轨迹将自动跳转到指定进度

2.所需更多定制化的操作可以使用插件中的属性 。例如监听轨迹移动角色的点击事件。拿到插件内部的\_PassMarker 根据 leaflet 官网的 L.marker 文档设置其监听事件

##下版本更新计划

1.加入轨迹开始，结束，暂停等更多事件

2.加入到达每项轨迹点的标注与动画功能

3.实现轨迹运行中动态增加轨迹点

4.代码结构
