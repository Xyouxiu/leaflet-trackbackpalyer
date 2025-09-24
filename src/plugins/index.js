import 'leaflet-rotatedmarker'
import L from "leaflet"
import 'leaflet-measure-path'
import 'leaflet-polylinedecorator'
import {
	assign
} from 'radash'
import dayjs from 'dayjs'
/**
 * @typedef {Object} OrginTrackItem
 * @property {number} lng - 经度
 * @property {number} lat - 纬度
 * @property {Date} time - 时间
 */


/**
 * @typedef {Object} TrackItem
 * @property {number} lng - 经度
 * @property {number} lat - 纬度
 * @property {Date} time - 时间
 * @property {number} rotate - 角度
 * @property {number} IntermediatePointsIndex 当前所运行到的缓冲中间点
 * @property {Array<IntermediatePointItem>} intermediatePoints 该坐标至下一个坐标的路径中间点 （通过calculateIntermediatePoints方法计算出的中间缓动点数组 第一项为A坐标的坐标点 最后一项为B坐标的坐标点，所以真正的中间点需要去掉这两项）
 * @property {number} duration //该坐标到下一个坐标之间运行的总动画时间 使用的setimeout进行动画 单位为时间戳毫秒 
 */

/**
 * @typedef {Object} IntermediatePointItem
 * @property {number} lng - 经度
 * @property {number} lat - 纬度
 */

/**
 * @typedef {Object} TrackLineConfig
 * @property {string} lineColor - 轨迹线条填充颜色 
 * @property {string} arrowColor  - 轨迹箭头颜色 可以不填，不填则不展示轨迹箭头
 */

/**
 * @typedef {Object} PassLineConfig
 * @property {string} lineColor - 轨迹线条填充颜色 
 * @property {string} arrowColor  - 轨迹箭头颜色 可以不填，不填则不展示轨迹箭头
 */


/**
 * @typedef {Object} TrackPlayerOptions
 * @property {number} speed - 速度 按整数的倍数
 * @property {Boolean} endedToStart 轨迹动画结束是否回到轨迹原点
 * @property {Boolean} loop - 轨迹动画是否循环播放
 * @property {Object} MarkerIcon
 * @property {TrackLineConfig} TrackLine
 * @property {PassLineConfig} PassLine
 */

export default class TrackPlayer {

	/**
	 * @type {boolean} 插件是否被激活
	 */
	_Alive = false

	_map = null

	_speed = 1 //速度: 标识上一个点移动到下一个点的速度1倍

	/**
	 * @type {'unStart'|'progress'|'end'} 轨迹状态 unStart:未开始 progress:进行中 end:已结束
	 */
	_TrackStatus = 'unStart'


	/**
	 * @type {TrackItem[]} 轨迹数据
	 */
	_Track_Data = []

	/**
	 * @type {TrackItem} 当前行驶的轨迹角色 所处进度的轨迹数据
	 */
	_CurTrackData = null

	/**
	 * @type {'stop'|'moving'} 行驶的轨迹角色对象状态 stop:停止状态 moving:正在移动
	 */
	_PassMarkStatus = 'stop'

	/**
	 * @type {Object}  行驶的轨迹角色对象L.marker实例
	 */
	_PassMarker = null


	/**
	 * @type {Object}  回放轨迹线L.Line实例
	 */
	_TrackLineDecorator = null
	_TrackLine = null




	/**
	 * @type {Object}  已行驶轨迹线L.Line实例
	 */
	_PassLineDecorator = null
	_PassLine = null

	/**
	 * @type {Object} 行驶轨迹图层
	 */
	_TrackerLayerGroup = null

	/**
	 * @type {number} 轨迹总进度
	 */
	_TrackProgress = 0.00


	/**
	 * @type {number} 进度步进值
	 */
	_TrackProgressStep = 0


	/**
	 * @type {Object} 轨迹运动动画timer对象
	 */
	_TrackAnimateTimer = null

	/**
	 * @description TrackPlayer 事件管理
	 * @property {Set} onProgressUpdate - 进度更新事件集合
	 */
	_Event = {
		'onProgressUpdate': new Set(),
		// 'onProgressStart': new Set(),
		// 'onProgressPause': new Set(),
		// 'onProgressEnd': new Set(),
		// 'onProgressDestroy': new Set(),
		'onArriveTrackPoint': new Set() //到达其中一个坐标点
	}

	_Options = {
		viewFollow: true,
		endedToStart: false, //结束是否恢复到起点
		loop: false,
		MarkerRotate: true, //默认轨迹移动角色 在移动时根据轨迹拐角进行旋转
		MarkerIcon: null,
		TrackLine: {
			lineColor: "#fff",
			arrowColor: '#000000'
		},
		PassLine: {
			lineColor: "#1afa29",
			arrowColor: '#FFFFFF'
		}

	}


	/**
	 * @description 计算每个坐标点之间间隔的时间单位 实现坐标点之间根据时间差计算动画移动时间，当为none表示每个路径缓冲点的动画时间为匀速100ms进行。 
	 * @type {'second'|'minute'|'hour'|'none'} 这个单位的作用就是防止有的两个坐标点之间的时间拉的很长导致实际运行的动画时间很长
	 */
	_duration_unit = 'minute'



	/**
	 * @description 控制坐标点之间生成的缓冲点个数 该属性为只读属性不允许外界更改 仅在代码开发时控制
	 */
	_IntermediatePointNumber = 500 //默认生成500个缓冲点

	/**
	 * @param {TrackPlayerOptions} options
	 */
	constructor(options) {
		this.setSpeed(options.speed)

		this._Options = assign(this._Options, options)
	}



	/**
	 * @description 初始化地图
	 * @param {Object} Map leaflet 地图实例对象
	 * @param {OrginTrackItem[]} TrackData 轨迹JSON数据 一定要按日期排序 越旧的日期排在前面 
	 */
	init(Map, TrackData) {
		if (this._Alive) return //防止多次初始化

		this._map = Map

		//计算PassMarker所处每个轨迹点的角度
		this._Track_Data = TrackData.map(item => ({
			...item,
			rotate: this._calcPassMarkerRotate(item, TrackData),
			IntermediatePointsIndex: 0,
			intermediatePoints: [],
			duration: 0
		}))

		//创建行驶轨迹图层添加到地图中
		this._TrackerLayerGroup = L.layerGroup().addTo(this._map);

		this._createTrackLine()

		this._createPassLine()

		this._createPassMarker()

		//计算进度步进数
		this._TrackProgressStep = 100 / (this._Track_Data.length - 1) / this._IntermediatePointNumber

		//激活插件
		this._Alive = true
		this._TrackStatus = 'progress'

		return {
			progressStep: this._TrackProgressStep //如需使用进度控制轨迹，则需要按指定轨迹步进数进行控制 
		}
	}

	/**
	 * @description 添加监听事件
	 * @param {String} EventType _Event中定义的事件类型
	 * @param {Function} EventCallBackFnc 触发回调事件
	 */
	on(EventType, EventCallBackFnc) {
		if (!this._Event[EventType]) return
		this._Event[EventType].add(EventCallBackFnc)
	}

	/**
	 * @description 添加监听事件
	 * @param {String} EventType _Event中定义的事件类型
	 * @param {Function} EventCallBackFnc 触发回调事件
	 */
	off(EventType, EventCallBackFnc) {
		if (!this._Event[EventType]) return
		if (this._Event[EventType].has(EventCallBackFnc)) {
			this._Event[EventType].delete(EventCallBackFnc)
		}
	}

	/**
	 * @description 添加轨迹数据
	 * @param {OrginTrackItem[]} trackData 
	 */
	addTrackData(oriTrackData) {
		if (!this._Alive) {
			console.error('轨迹插件未初始化')
			return
		}
		let trackData = oriTrackData.map(item => {
			return {
				...item,
				rotate: this._calcPassMarkerRotate(item, oriTrackData),
				IntermediatePointsIndex: 0,
				intermediatePoints: [],
				duration: 0
			}
		})
		trackData = this._Track_Data.concat(trackData)
		this._TrackLine.setLatLngs(trackData.map(item => {
			return {
				lat: item.lat,
				lng: item.lng
			}
		}))
		this._TrackLineDecorator.setPaths(this._TrackLine)

		this._Track_Data = trackData

	}


	/**
	 * @description 开始运行轨迹
	 * @param {number} progress  轨迹运行进度，不传则以当前记录的进度继续运行。传入进度则跳转到指定进度开始运行
	 */
	startTrack(progress) {


		if (this._TrackStatus == 'unStart') return
		this._PassMarkStatus = 'moving'
		this._TrackStatus = 'progress'

		this._setProgress(progress)

		//如果设置开始的进度不等于0 例如从中间进度开始播放 则需要将当前位置设置为该进度所处位置的上一个位置，因为触发立刻移动方法将会立刻移动到下一步。所以地图上表示出来的效果就是移动到该进度所处位置
		if (progress && progress !== 0) {

			let curProgressCopies = calcProgressCopies((this._Track_Data.length - 1) * this
				._IntermediatePointNumber, progress) //计算出当前进度所处总轨迹中的哪一步
			curProgressCopies % 1 > 0 && (console.warn('请按插件所返回的进度步进范围进行控制，否则进度将可能导致不一致'))
			let Copies = String(Math.round(curProgressCopies) / this._IntermediatePointNumber).split('.')
			let curTrackIndex = Number(Copies[0])
			let curIntermediatePointIndex = Number(Copies[1] ? '0.' + Copies[1] : 0) * this._IntermediatePointNumber

			this._CurTrackData = this._Track_Data[curTrackIndex] //由于将要立刻触发移动方法会移动到下一步。而下一步为该进度所处的位置，所以设置当前所处轨迹为上一步
			this._CurTrackData.IntermediatePointsIndex = curIntermediatePointIndex

		} else if (progress == 0) {

			//当传入的progress进度为0 时，将当前所运行到的坐标置为空
			this._CurTrackData = null
		}

		//先清除动画，保证下一步触发移动时 不会被干扰
		if (this._TrackAnimateTimer) {
			this._TrackAnimateTimer && clearTimeout(this._TrackAnimateTimer)
			this._TrackAnimateTimer = null
		}

		this._TrackPassMarkerMove() //立即触发移动
		this._animateTrack() //开始加载自动轨迹移动动画
	}

	/**
	 * @description 重置
	 */
	reStart() {
		if (this._TrackAnimateTimer) {
			this._TrackAnimateTimer && clearTimeout(this._TrackAnimateTimer)
			this._TrackAnimateTimer = null
		}
		this._Track_Data = this._Track_Data.map(item => ({
			...item,
			IntermediatePointsIndex: 0, //重新置空下标
		}))
		this._TrackStatus = 'progress'

		this._PassMarkStatus = 'stop'
		//将当前达到运行的坐标置为空 
		this._CurTrackData = null
		this._TrackPassMarkerMove() //立即触发移动 回到开始位置
	}


	/**
	 * @description 销毁轨迹运动
	 */
	destroyTrack() {
		if (!this._Alive) return //只有插件被激活才能被销毁
		//重置插件属性
		this._Track_Data = []
		this._CurTrackData = null
		this._TrackStatus = 'end'
		this._PassMarkStatus = 'stop'
		this._TrackProgress = 0.00
		this._TrackProgressStep = 0
		this._speed = 1
		if (this._TrackAnimateTimer) {
			this._TrackAnimateTimer && clearTimeout(this._TrackAnimateTimer)
			this._TrackAnimateTimer = null
		}
		this._map.removeLayer(this._PassMarker)
		this._TrackerLayerGroup.clearLayers() //从track插件的group地图图层中移除其他所有子图层
		this._PassMarker = null //已经被group图层移除 解除引用关系防止内存泄漏

		this._PassLineDecorator = null
		this._PassLine = null

		this._TrackLineDecorator = null
		this._TrackLine = null

		this._map.removeLayer(this._TrackerLayerGroup) //将track插件的group图层从地图中移除
		this._TrackerLayerGroup = null

		//重置插件事件
		Object.keys(this._Event).forEach(eventName => {
			this._Event[eventName] = new Set()
		})
	}

	/**
	 * @description 暂停轨迹运动
	 */
	pauseTrack() {
		this._TrackStatus = 'progress'
		this._PassMarkStatus = 'stop'
		if (this._TrackAnimateTimer) {
			this._TrackAnimateTimer && clearTimeout(this._TrackAnimateTimer)
			this._TrackAnimateTimer = null
		}
	}

	_endTrack() {
		this._TrackStatus = 'end'
		this._PassMarkStatus = 'stop'
		this._CurTrackData = null
		this._Track_Data = this._Track_Data.map(item => ({
			...item,
			IntermediatePointsIndex: 0, //重新置空下标
		}))


		if (this._TrackAnimateTimer) {
			this._TrackAnimateTimer && clearTimeout(this._TrackAnimateTimer)
			this._TrackAnimateTimer = null
		}



		//如果结束后重新回到起点
		if (this._Options.endedToStart) {
			this._TrackStatus = 'progress'

			this._PassMarkStatus = 'stop'
			//将当前达到运行的坐标置为空 
			this._CurTrackData = null
			this._TrackPassMarkerMove() //立即触发移动 回到开始位置

		}

		//如果进行循环
		if (this._Options.loop) {
			this._TrackStatus = 'progress'

			this._PassMarkStatus = 'stop'
			this.startTrack(0)
		}



	}

	/**
	 * @description 自动轨迹运动动画
	 */
	_animateTrack() {
		if (this._TrackAnimateTimer) {

			this._TrackAnimateTimer && clearTimeout(this._TrackAnimateTimer)
			this._TrackAnimateTimer = null
		}

		//计算Marker在每个坐标间路径上缓冲点之间的动画时间
		let easingAnimateTime; //计算两个坐标点之间的 中间缓动点之间的动画间隔时间
		if (this._duration_unit != 'none') {
			easingAnimateTime = this._CurTrackData.duration / this._CurTrackData.intermediatePoints.length
		} else {
			easingAnimateTime = 100
		}

		easingAnimateTime = easingAnimateTime / this._speed //还要除以用户设置的速度 速度越快缓冲点间的动画间隔越短

		if (easingAnimateTime < 20) {
			console.warn('⚠ 当动画时间间隔小于20ms ，将无法达到直观的坐标点之间运动时间效果 请调整_duration_unit与_speed参数')
		}


		this._TrackAnimateTimer = setTimeout(() => {
			//当行驶的轨迹角色对象处于可移动时。则进行移动的逻辑处理
			if (this._PassMarkStatus == 'moving') {
				this._TrackPassMarkerMove()

			}

			//只有当轨迹状态处于进行中 则可不断进行动画播放
			if (this._TrackStatus == 'progress') {
				this._animateTrack()
			}
		}, easingAnimateTime)
	}


	/**
	 * @description 处理轨迹运动对象运动逻辑 立即移动到下一个点
	 */
	_TrackPassMarkerMove() {

		let nextTrackData;
		let nextTrackIndex = 0;
		if (!this._CurTrackData) { //不存在说明之前没有进行过轨迹运动
			nextTrackData = this._Track_Data[0]
		} else {
			nextTrackIndex = this._Track_Data.findIndex(item => item.time == this._CurTrackData
				.time) //以时间为标识 找到运动轨迹对象这次所需要运行到的坐标

			nextTrackData = this._Track_Data[nextTrackIndex]
			//判断该坐标的路径点是否全部执行完
			if (nextTrackData.IntermediatePointsIndex < nextTrackData.intermediatePoints.length - 1) {

				nextTrackData.IntermediatePointsIndex += 1
			} else {

				//如果该路径点已全部执行完 那么判断已经到下一个坐标点了
				nextTrackIndex += 1
				nextTrackData = this._Track_Data[nextTrackIndex]
				nextTrackData.IntermediatePointsIndex = 0 //每次到达新的坐标点 这个坐标点至下个坐标点的路径都从0开始，解决轨迹进度回溯导致的轨迹路径跳跃的问题
			}
		}




		//如果正在运行的轨迹点是 最后一个了则结束轨迹运动
		if (nextTrackIndex >= this._Track_Data.length - 1) {
			this._endTrack()
			return
		}

		//如果该坐标的路径中间点从0开始的 说明才开始执行该路径上的中间点动画。计算出该坐标到下一个坐标的路径中间点
		if (nextTrackData.intermediatePoints.length == 0) {
			let startTrack = nextTrackData
			let endTrack = this._Track_Data[nextTrackIndex + 1]
			//实际上这里的nextTrackData 表示正所处的坐标点。
			nextTrackData.intermediatePoints = calculateIntermediatePoints([startTrack.lat, startTrack.lng], [
				endTrack.lat, endTrack.lng
			], this._IntermediatePointNumber)
		}
		//由于可通过外界动态随时更改duration_unit 所以每次都需要重新计算 两个坐标点的运行间隔
		let timeDiff = dayjs(this._Track_Data[nextTrackIndex + 1].time).valueOf() - dayjs(nextTrackData.time)
			.valueOf()

		switch (this._duration_unit) {
			case 'second':
				nextTrackData.duration = timeDiff
				break;
			case 'minute':
				nextTrackData.duration = timeDiff / 6
				break;
			case 'hour':
				nextTrackData.duration = timeDiff / 36
				break;
			case 'none': //如果_duration_unit 为none表示每段坐标间路径的缓冲点均已匀速进行
				break;
		}





		//更新行驶的轨迹角色位置
		this._PassMarker.setLatLng({
			lat: nextTrackData.intermediatePoints[nextTrackData.IntermediatePointsIndex].lat,
			lng: nextTrackData.intermediatePoints[nextTrackData.IntermediatePointsIndex].lng
		})



		if (this._Options.MarkerRotate) {
			this._PassMarker.setRotationAngle((nextTrackData.rotate * 180 / Math.PI) / 2)
		}

		//更新已行驶的轨迹路径
		let PassTrackData = this._Track_Data.filter((item, index) => nextTrackIndex >= index).map(item => L.latLng({
			lng: item.lng,
			lat: item.lat
		}))



		this._PassLine.setLatLngs(PassTrackData.concat(nextTrackData.intermediatePoints.filter(((item, index) =>
			nextTrackData.IntermediatePointsIndex >= index)))) //拼接上缓冲点的坐标数据
		this._PassLineDecorator.setPaths(this._PassLine)


		//到达一个新的坐标点时发布onArriveTrackPoint事件
		if (nextTrackData.IntermediatePointsIndex == 0) {
			this._Event.onArriveTrackPoint.forEach(event => event(nextTrackData))
		}


		//如果开启了视角跟随
		if (this._Options.viewFollow && nextTrackData.IntermediatePointsIndex == 0) {
			this._map.flyTo({
				lat: nextTrackData.intermediatePoints[nextTrackData.IntermediatePointsIndex].lat,
				lng: nextTrackData.intermediatePoints[nextTrackData.IntermediatePointsIndex].lng
			}, this._map.getZoom())
		}


		this._CurTrackData = nextTrackData



		//计算出当前轨迹数据处于总轨迹的百分比 正在进行的坐标点进度 加上 该坐标点至下一个坐标点的缓冲点进度
		let progress = (100 / (this._Track_Data.length - 1) * nextTrackIndex) + (100 / (this._Track_Data.length -
			1) / this._IntermediatePointNumber * nextTrackData.IntermediatePointsIndex)


		// console.log(progress)
		this._setProgress(progress)



	}



	/**
	 * @description 创建回放轨迹线 
	 */
	_createTrackLine() {

		// 画回放轨迹线，把线添加到图层组
		this._TrackLine = L.polyline(this._Track_Data.map(d => ({
			lng: d.lng,
			lat: d.lat
		})), {
			color: this._Options.TrackLine?.lineColor,
			weight: 5
		}).addTo(this._TrackerLayerGroup);

		let symbol;
		if (this._Options.TrackLine?.arrowColor) {
			symbol = L.Symbol.arrowHead({
				pixelSize: 5,
				headAngle: 75,
				polygon: false,
				pathOptions: {
					stroke: true,
					weight: 2,
					color: this._Options.TrackLine?.arrowColor
				}
			})
		}




		// 把line和marker 组合
		this._TrackLineDecorator = L.polylineDecorator(this._TrackLine, {
			patterns: symbol ? [{
				offset: 1, //第一个图标偏移
				endOffset: 1, //最后一个图标偏移
				repeat: '100', //图标间距
				symbol: symbol
			}] : []
		}).addTo(this._TrackerLayerGroup)
	}

	/**
	 * @description 创建已行驶的路线
	 */
	_createPassLine() {
		// 画回放轨迹线，把线添加到图层组
		this._PassLine = L.polyline([{
			lat: this._Track_Data[0]?.lat,
			lng: this._Track_Data[0]?.lng
		}], {
			color: this._Options.PassLine?.lineColor,
			weight: 5
		}).addTo(this._TrackerLayerGroup);


		let symbol;
		if (this._Options.PassLine?.arrowColor) {
			symbol = L.Symbol.arrowHead({
				pixelSize: 5,
				headAngle: 75,
				polygon: false,
				pathOptions: {
					stroke: true,
					weight: 2,
					color: this._Options.PassLine?.arrowColor
				}
			})
		}


		this._PassLineDecorator = L.polylineDecorator(this._PassLine, {
			patterns: symbol ? [{
				offset: 1, //第一个图标偏移
				endOffset: 1, //最后一个图标偏移
				repeat: '100', //图标间距
				symbol: symbol
			}] : []
		}).addTo(this._TrackerLayerGroup)
	}




	/**
	 * @description 创建行驶的轨迹角色对象marker实例
	 */
	_createPassMarker() {
		if (!this._Options.MarkerIcon) {
			this._Options.MarkerIcon = L.icon({
				iconUrl: require('../../static/plane.png'),
				iconSize: [30, 30], // icon的大小
				iconAnchor: [16, 15], // icon的渲染的位置（相对与marker）
				shadowAnchor: [0, 0], // shadow的渲染的位置（相对于marker）
				popupAnchor: [0, 0] //若是绑定了popup的popup的打开位置（相对于icon）
			});
		}

		let startPosition = this._Track_Data[0]

		this._PassMarker = L.marker({
			lng: startPosition?.lng,
			lat: startPosition?.lat
		}, {
			icon: this._Options.MarkerIcon,
			rotationAngle: this._Options.MarkerRotate ? (startPosition.rotate * 180 / Math.PI) / 2 : 0
		}).addTo(this._map);

	}




	/**
	 * @description 设置进度
	 * @param 进度
	 */
	_setProgress(progress) {
		this._TrackProgress = progress

		Promise.resolve().then(() => {
			let params = {
				speed: this.speed,
				progress: this._TrackProgress,
				progressStep: this._TrackProgressStep,
				move_status: this._PassMarkStatus, //行驶的轨迹角色对象状态
				tarck_status: this._TrackStatus, //轨迹状态 unStart:未开始 progress:进行中 end:已结束
				MOVE_MARKER: this._PassMarker, //行驶的轨迹角色对象L.marker实例
				TRACK_PASS_LINE: this._PassLineDecorator, //已行驶轨迹线L.Line实例
			}
			//触发进度更新回调
			this._Event['onProgressUpdate'].forEach(event => event(params))
		})
	}



	/**
	 * @description 设置行驶速度
	 * @param {number} speed 速度
	 */
	setSpeed(speed) {
		if (!speed) return
		this._speed = speed
	}

	/**
	 * @description 计算指定节点Marker的角度
	 * @param {TrackItem} curTrackPointData  当前PassMarker所处于的轨迹位置数据
	 */
	_calcPassMarkerRotate(curTrackPointData, Track_Data) {

		let curTrackIndex = Track_Data.findIndex(item => item.time == curTrackPointData.time)

		let nextTrackData = Track_Data[curTrackIndex + 1]
		if (!nextTrackData) return //不存在则可能是已经处于最后一个行驶轨迹点了 所以没有下一个轨迹点直接return

		let dx = nextTrackData.lat - curTrackPointData.lat;
		let dy = nextTrackData.lng - curTrackPointData.lng;

		let rotation = Math.atan2(dy, dx);
		// console.log(rotation)
		return rotation
	}




}

/**
 * @description 计算当前进度所占所进度的份数
 * @param {Object} totalLength 总份数
 * @param {Object} curProgress 当前进度
 */
function calcProgressCopies(totalLength, curProgress) {


	let progressStep = 100 / totalLength
	return curProgress / progressStep
}





/**
 * @description 计算坐标之间路径的中间点 - 使用线性插值算法得出两点间的缓冲点
 * @param {Object} start 开始坐标点
 * @param {Object} end 结束坐标点
 * @param {Object} numPoints 需要生成中间点数量
 * @param {Boolean} hasContainStartAndEnd 生成的中间点是否包含开始和结束点
 */

function calculateIntermediatePoints(start, end, numPoints) {

	const points = [];
	const latStart = start[0];
	const lngStart = start[1];
	const latEnd = end[0];
	const lngEnd = end[1];

	const latStep = (latEnd - latStart) / numPoints;
	const lngStep = (lngEnd - lngStart) / numPoints;

	for (let i = 0; i <= numPoints; i++) {
		const lat = latStart + (latStep * i);
		const lng = lngStart + (lngStep * i);
		points.push({
			lat: lat,
			lng: lng
		});
	}



	return points //除掉第一项开始的坐标点 和最后一项结束的坐标点
}