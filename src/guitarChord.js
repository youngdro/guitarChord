// 检测数据类型的公用方法
function is(data) {
	return function(type) {
		return Object.prototype.toString.call(data) === `[object ${type}]`;
	}
}

// 单音类，用于音的映射查询与音高的改变，同时可标记记录其在吉他上的位置
class Tone {
	constructor(toneString = '1', string, fret) {
		this.syllableMap = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si']; // 所有唱名数组
		this.keyMap = ['1', ['#1', 'b2'], '2', ['#2', 'b3'], '3', '4', ['#4', 'b5'], '5', ['#5', 'b6'], '6', ['#6', 'b7'], '7']; // 音程
		this.intervalMap = ['C', ['#C', 'bD'], 'D', ['#D', 'bE'], 'E', 'F', ['#F', 'bG'], 'G', ['#G', 'bA'], 'A', ['#A', 'bB'], 'B']; //所有调名
		this.toneString = toneString; // 单音的字符串表示
		this.toneNormal = toneString.replace(/\./g, ''); // 单音的字符串表示（去除八度标记）
		this.key = toneString.replace(/\.|b|#/g, ''); // 数字音
		this.syllableName = this.syllableMap[+this.key - 1]; // 唱名
		this.flat = toneString.match('b') ? 'b' : ''; // 降半调标记
		this.sharp = toneString.match('#') ? '#' : ''; // 升半调标记
		let octave_arr = toneString.split(this.key);
		let octave_flat = octave_arr[0].toString().match(/\./g);
		let octave_sharp = octave_arr[1].toString().match(/\./g);
		this.octave = (octave_sharp ? octave_sharp.length : 0) - (octave_flat ? octave_flat.length : 0); // 八度度数
		// 吉他按弦位置
		this.position = {
			string: string, // 第几弦
			fret: fret // 第几品格
		};
	}
	// 获取某个音在音程上的位置
	findKeyIndex(keyString) {
		return this.keyMap.findIndex((item) => {
			if (is(item)('Array')) {
				return item.includes(keyString);
			} else if (item === keyString) {
				return true;
			} else {
				return false;
			}
		});
	}
	// 音高增减，num为增或减的半音数量
	step(num) {
		let keyString = this.flat + this.sharp + this.key;
		let len = this.keyMap.length;
		let index = this.findKeyIndex(keyString);
		if (index > -1) {
			num = +num;
			// 计算改变音高后的音在音程上的位置
			let nextIndex = parseInt(index + num, 0);
			let octave = this.octave;
			if (nextIndex >= len) {
				let index_gap = nextIndex - len;
				octave += Math.floor(index_gap / len) + 1;
				nextIndex = index_gap % len;
			} else if (nextIndex < 0) {
				let index_gap = nextIndex;
				octave += Math.floor(index_gap / len);
				nextIndex = index_gap % len + len;
			}
			let nextKey = this.keyMap[nextIndex];
			// 计算并添加高低八度的记号
			let octaveString = new Array(Math.abs(octave)).fill('.').join('');
			let toneString = '';
			if (!is(nextKey)('Array')) {
				toneString = (octave < 0 ? octaveString : '') + nextKey + (octave > 0 ? octaveString : '');
				return new this.constructor(toneString, this.position.string, this.position.fret + num);
			} else {
				// 可能得到两个音高一样但标记方式不一样的音
				return nextKey.map((key) => {
					return new this.constructor((octave < 0 ? octaveString : '') + key + (octave > 0 ? octaveString : ''), this.position.string, this.position.fret + num);
				});
			}
		} else {
			return null;
		}
	}
}

// 吉他和弦推导类
class GuitarChord {
	constructor() {
		// 吉他的最大品格数
		this.fretLength = 15;
		// 构建1到6弦的初始音
		this.initialTone = [
			new Tone('3.', 1, 0),
			new Tone('7', 2, 0),
			new Tone('5', 3, 0),
			new Tone('2', 4, 0),
			new Tone('.6', 5, 0),
			new Tone('.3', 6, 0)
		];
		// 用于吉他上所有位置对应的音
		this.toneMap = [];
		// 从1到6弦，从品数的低到高，依次计算每个位置的音
		for (let string = 1; string <= this.initialTone.length; string++) {
			this.toneMap[string] = [];
			for (let fret = 0; fret <= this.fretLength; fret++) {
				this.toneMap[string].push(this.initialTone[string - 1].step(fret));
			}
		}
	}
	// 在指定的品格数范围内，查找某个音在某根弦的音域下所有的品格位置
	/*
	 * @param key 搜寻的音（字符串形式）
	 * @param toneArray 音域数组，即某根弦上所有单音类按顺序组成的数组
	 * @param fretStart 搜寻的最低品格数
	 * @param fretEnd 搜寻的最高品格数
	 */
	findFret(key, toneArray, fretStart, fretEnd) {
		key = key.replace(/\./g, '');
		let fretArray = [];
		fretStart = fretStart ? fretStart : 0;
		fretEnd = fretEnd ? (fretEnd + 1) : toneArray.length;
		for (let i = fretStart; i < fretEnd; i++) {
			if (is(toneArray[i])('Array')) {
				let toneStringArray = toneArray[i].map((item) => {
					return item.toneNormal;
				});
				if (toneStringArray.includes(key)) {
					fretArray.push(i);
				}
			} else {
				if (toneArray[i].toneString.replace(/\./g, '') === key) {
					fretArray.push(i);
				}
			}
		}
		return fretArray;
	}

	// 递归遍历范围内的指定和弦的所有位置组合
	/*
	 * @param stringIndex 当前遍历到的弦的序号
	 * @param toneIndex 上一根弦使用的音的序号（用于相邻的两根弦的音不重复）
	 * @param fretStart 遍历的最低品格数
	 * @param fretEnd 遍历的最高品格数
	 * @param preResult 上一根弦确定的音的结果
	 * @param positionSave 保存该轮递归的结果
	 */
	calc(stringIndex, toneIndex, fretStart, fretEnd, preResult, positionSave) {
		let toneArray = this.toneMap[stringIndex];
		let result = false;
		// 从和弦音的数组里逐个选出音进行试探
		for (let i = 0; i < this.chordTone.length; i++) {
			// 相邻的上一根弦已使用的音不做本次计算
			if (i !== toneIndex) {
				let resultNext = false;
				let toneKey = this.chordTone[i];
				// 在品格范围内查找当前音的位置
				let fret = this.findFret(toneKey, toneArray, fretStart, fretEnd);
				// 品格范围内存在该音
				if (fret.length > 0) {
					// 记录该音的位置，几弦几品与音的数字描述
					let resultNow = {
						string: stringIndex,
						fret: fret[0],
						key: toneKey
					}
					// 在本次记录上保存上一根弦的结果，方便回溯
					resultNow.pre = preResult ? preResult : null;
					// 保存本次结果
					positionSave.push(resultNow);
					// 设置该弦上的结果标记
					resultNext = true;
					// 没有遍历完所有6根弦，则继续往下一根弦计算，附带上本次的结果记录
					if (stringIndex < this.initialTone.length) {
						let nextStringIndex = stringIndex + 1;
						// 该弦上的结果的有效标记，取决上它后面的弦的结果均有效
						resultNext = resultNext && this.calc(nextStringIndex, i, fretStart, fretEnd, resultNow, positionSave);
					} else {
						// 所有弦均遍历成功，代表递归结果有效
						resultNext = true;
					}
					// 在该弦的计算结果无效，吐出之前保存的该弦结果
					if (!resultNext) {
						positionSave.pop();
					}
				} else {
					// 品格范围内不存在该音
					resultNext = false;
				}
				// 任意一个和弦里的音，能在该弦取得有效结果，则该弦上的结果有效
				result = result || resultNext;
			}
		};
		return result;
	}
	// 和弦组成音完整性过滤
	integrityFilter(preResult) {
		return preResult.filter((chordItem) => {
			let keyCount = [...new Set(chordItem.map(item => item.key).filter(key => key != null))].length;
			return keyCount === this.chordTone.length;
		});
	}
	// 按弦手指数量过滤
	fingerFilter(preResult) {
		return preResult.filter((chordItem) => {
			// 按弦的最小品位
			let minFret = Math.min.apply(null, chordItem.map(item => item.fret).filter(fret => (fret != null)));
			// 记录需要的手指数量
			let fingerNum = minFret > 0 ? 1 : 0;
			chordItem.forEach((item) => {
				if (item.fret != null && item.fret > minFret) {
					fingerNum++;
				}
			});
			return fingerNum <= 4;
		});
	}
	// 根音条件过滤
	rootToneFilter(preResult) {
		let nextResult = new Set();
		preResult.forEach((item) => {
			// 允许发声的弦的总数，初始为6
			let realStringLength = 6;
			// 从低音弦到高音弦遍历，不符合根音条件则禁止其发声
			for (var i = item.length - 1; i >= 0; i--) {
				if (item[i].key !== this.rootTone) {
					item[i].fret = null;
					item[i].key = null;
					realStringLength--;
				} else {
					break;
				}
			}
			if (realStringLength >= 4) {
				// 去重复
				nextResult.add(JSON.stringify(item));
			}
		});
		// 去重后的Set解析成对应数组返回
		return [...nextResult].map(item => JSON.parse(item));
	}
	// 和弦指法过滤器
	filter(positionSave) {
		// 从6弦开始回溯记录的和弦指法结果，拆解出所有指法组合
		let allResult = positionSave.filter((item) => {
			return item.string === this.initialTone.length
		}).map((item) => {
			let resultItem = [{
				string: item.string,
				fret: item.fret,
				key: item.key
			}];
			while (item.pre) {
				item = item.pre;
				resultItem.unshift({
					string: item.string,
					fret: item.fret,
					key: item.key
				});
			}
			return resultItem;
		});
		if (allResult.length > 0) {
			// 依次调用各个过滤器
			return this.integrityFilter(this.fingerFilter(this.rootToneFilter(allResult)));
		} else {
			return [];
		}
	}
	// 和弦指法计算入口
	chord() {
		let chordTone;
		if (is(arguments[0])('Array')) {
			chordTone = arguments[0];
		} else {
			chordTone = Array.prototype.slice.apply(arguments).map((item) => {
				let tone = new Tone(item.toString());
				return tone.flat + tone.sharp + tone.key;
			});
		}
		// 和弦组成音
		this.chordTone = chordTone;
		// 根音
		this.rootTone = chordTone[0];
		this.chordResult = [];
		let fretArray = [];
		// 查找和弦里的音可能存在的品格位置，保存至fretArray
		chordTone.forEach((item) => {
			for (let i = 1; i < this.toneMap.length; i++) {
				fretArray = fretArray.concat(this.findFret(item, this.toneMap[i]));
			}
		});
		fretArray = [...new Set(fretArray)];
		// 品格位置从小到大排序
		fretArray.sort((a, b) => {
			return a - b;
		});
		// 从低把位到高把位，计算范围内的所有该和弦指法
		for (let i = 0; i < fretArray.length; i++) {
			let fretStart = fretArray[i];
			// 在不需要使用大横按时，即在最低的把位计算时，可把计算的品格范围扩大一格
			let fretEnd = fretStart > 0 ? (fretStart + 4) : (fretStart + 5);
			// 最高范围不能超过吉他的最高品格数
			if (fretEnd <= this.fretLength) {
				let positionSave = [];
				// 从1弦开始启动递归计算
				if (this.calc(1, null, fretStart, fretEnd, null, positionSave)) {
					// 单次结果过滤并保存
					this.chordResult.push(...this.filter(positionSave));
				}
			}
		}
		// 结果去重
		let result = [...new Set(this.chordResult.map(item => JSON.stringify(item)))].map(item => JSON.parse(item));
		return result;
	}
}

// 和弦名称推导
class ChordName {
	constructor(chordTone) {
		// 实例化一个单音类做工具，用来计算音与各种标记的映射关系
		this.toneUtil = new Tone();
	}
	// 获取两个音的间隔跨度
	getToneSpace(tonePre, toneNext) {
		let toneSpace = this.toneUtil.findKeyIndex(toneNext) - this.toneUtil.findKeyIndex(tonePre);
		return toneSpace = toneSpace < 0 ? toneSpace + 12 : toneSpace;
	}
	// 大三度
	isMajorThird(tonePre, toneNext) {
		return this.getToneSpace(tonePre, toneNext) === 4;
	}
	// 小三度
	isMinorThird(tonePre, toneNext) {
		return this.getToneSpace(tonePre, toneNext) === 3;
	}
	// 增三度
	isMajorMajorThird(tonePre, toneNext) {
		return this.getToneSpace(tonePre, toneNext) === 5;
	}
	// 减三度
	isMinorMinorThird(tonePre, toneNext) {
		return this.getToneSpace(tonePre, toneNext) === 2;
	}
	// 大三和弦
	isMajorChord(chordTone) {
		return this.isMajorThird(chordTone[0], chordTone[1]) && this.isMinorThird(chordTone[1], chordTone[2]);
	}
	// 小三和弦 m
	isMinorChord(chordTone) {
		return this.isMinorThird(chordTone[0], chordTone[1]) && this.isMajorThird(chordTone[1], chordTone[2]);
	}
	// 增三和弦 aug
	isAugmentedChord(chordTone) {
		return this.isMajorThird(chordTone[0], chordTone[1]) && this.isMajorThird(chordTone[1], chordTone[2]);
	}
	// 减三和弦 dim
	isDiminishedChord(chordTone) {
		return this.isMinorThird(chordTone[0], chordTone[1]) && this.isMinorThird(chordTone[1], chordTone[2]);
	}
	// 挂四和弦
	isSus4(chordTone) {
		return this.isMajorMajorThird(chordTone[0], chordTone[1]) && this.isMinorMinorThird(chordTone[1], chordTone[2]);
	}
	// 大小七和弦/属七和弦 7 / Mm7
	isMajorMinorSeventhChord(chordTone) {
		if (chordTone.length < 4) return false;
		return this.isMajorChord(chordTone) && this.isMinorThird(chordTone[2], chordTone[3]);
	}
	// 小大七和弦 mM7
	isMinorMajorSeventhChord(chordTone) {
		if (chordTone.length < 4) return false;
		return this.isMinorChord(chordTone) && this.isMajorThird(chordTone[2], chordTone[3]);
	}
	// 大七和弦 maj7 / M7
	isMajorMajorSeventhChord(chordTone) {
		if (chordTone.length < 4) return false;
		return this.isMajorChord(chordTone) && this.isMajorThird(chordTone[2], chordTone[3]);
	}
	// 小七和弦 m7 / mm7
	isMinorMinorSeventhChord(chordTone) {
		if (chordTone.length < 4) return false;
		return this.isMinorChord(chordTone) && this.isMinorThird(chordTone[2], chordTone[3]);
	}
	// 减七和弦 dim7
	isDiminishedSeventhChord(chordTone) {
		if (chordTone.length < 4) return false;
		return this.isDiminishedChord(chordTone) && this.isMinorThird(chordTone[2], chordTone[3]);
	}
	// 半减七和弦 m7-5
	isHalfDiminishedSeventhChord(chordTone) {
		if (chordTone.length < 4) return false;
		return this.isDiminishedChord(chordTone) && this.isMajorThird(chordTone[2], chordTone[3]);
	}
	// 增属七和弦  7#5 / M7+5
	isHalfAugmentedSeventhChord(chordTone) {
		if (chordTone.length < 4) return false;
		return this.isAugmentedChord(chordTone) && this.isMinorMinorThird(chordTone[2], chordTone[3]);
	}
	// 增大七和弦 aug7 / Maj7#5
	isAugmentedSeventhChord(chordTone) {
		if (chordTone.length < 4) return false;
		return this.isAugmentedChord(chordTone) && this.isMinorThird(chordTone[2], chordTone[3]);
	}
	// 获取音对应的根音和弦名
	getKeyName(key) {
		let keyName = this.toneUtil.intervalMap[this.toneUtil.findKeyIndex(key)];
		if (is(keyName)('Array')) {
			keyName = /b/.test(key) ? keyName[1] : keyName[0];
		};
		return keyName;
	}
	// 计算和弦名
	getChordName(chordTone) {
		let rootKey = chordTone[0];
		// 和弦的字母名
		let chordRootName = this.getKeyName(rootKey);
		// 和弦字母后面的具体修饰名
		let suffix = '...';
		let suffixArr = [];
		// 三音和弦的遍历方法及对应修饰名
		let chord3SuffixMap = [{
			fn: this.isMajorChord,
			suffix: ''
		}, {
			fn: this.isMinorChord,
			suffix: 'm'
		}, {
			fn: this.isAugmentedChord,
			suffix: 'aug'
		}, {
			fn: this.isDiminishedChord,
			suffix: 'dim'
		}, {
			fn: this.isSus4,
			suffix: 'sus4'
		}];
		// 四音和弦的遍历方法及对应修饰名
		let chord4SuffixMap = [{
			fn: this.isMajorMinorSeventhChord,
			suffix: '7'
		}, {
			fn: this.isMinorMajorSeventhChord,
			suffix: 'mM7'
		}, {
			fn: this.isMajorMajorSeventhChord,
			suffix: 'maj7'
		}, {
			fn: this.isMinorMinorSeventhChord,
			suffix: 'm7'
		}, {
			fn: this.isDiminishedSeventhChord,
			suffix: 'dim7'
		}, {
			fn: this.isHalfDiminishedSeventhChord,
			suffix: 'm7-5'
		}, {
			fn: this.isHalfAugmentedSeventhChord,
			suffix: '7#5'
		}, {
			fn: this.isAugmentedSeventhChord,
			suffix: 'aug7'
		}];
		if (chordTone.length === 3) {
			suffixArr = chord3SuffixMap.filter((item) => {
				return item.fn.bind(this, chordTone)();
			});
			suffix = suffixArr.length > 0 ? suffixArr[0].suffix : suffix;
		} else {
			suffixArr = chord4SuffixMap.filter((item) => {
				return item.fn.bind(this, chordTone)();
			});
			suffix = suffixArr.length > 0 ? suffixArr[0].suffix : suffix;
		}
		// 拼接起来得到完整的和弦名
		return chordRootName + suffix;
	}
}

// 和弦svg绘图
class ChordSvg {
	constructor() {
		this.SVG_NS = "http://www.w3.org/2000/svg";
		this.XLINK_NS = "http://www.w3.org/1999/xlink";
		this.ATTR_MAP = {
			"className": "class",
			"svgHref": "href"
		};
		this.NS_MAP = {
			"svgHref": this.XLINK_NS
		};
		this.initChordSvg();
		this.minFret = 0;
	}
	// 创建svg相关元素
	createSVG(tag, attributes) {
		let elem = document.createElementNS(this.SVG_NS, tag);
		for (let attribute in attributes) {
			let name = (attribute in this.ATTR_MAP ? this.ATTR_MAP[attribute] : attribute);
			let value = attributes[attribute];
			if (attribute in this.NS_MAP) {
				elem.setAttributeNS(this.NS_MAP[attribute], name, value);
			} else {
				elem.setAttribute(name, value);
			}
		}
		return elem;
	}
	// 创建use标签
	createUse(href, x, y) {
		return this.createSVG('use', {
			svgHref: href,
			x: x,
			y: y
		});
	}
	// 设置禁止弹奏的叉号位置，位于几弦
	setForbidden(svg, string = 6) {
		svg.appendChild(this.createUse('#forbidden', 25 + 20 * (6 - string), 30));
	}
	// 设置空弦弹奏的空心圈位置，位于几弦
	setOpen(svg, string = 6) {
		svg.appendChild(this.createUse('#blank_circle', 25 + 20 * (6 - string), 30));
	}
	// 设置指法按弦位置，几弦几品
	setFinger(svg, string = 6, fret = 0) {
		if (+fret > 0 && +fret <= 5) {
			svg.appendChild(this.createUse('#block_circle', 25 + 20 * (6 - string), 35 + 20 * fret));
		}
	}
	// 设置大横按位置
	setBarre(svg, stringTo, fret, barreFret) {
		if (fret > 0 && fret <= 5) {
			svg.appendChild(this.createSVG('rect', {
				className: 'chord-barre',
				width: stringTo * 20,
				x: 15 + 20 * (6 - stringTo),
				y: 27 + 20 * fret,
				rx: 8,
				ry: 8
			}));
		}
	}
	// 设置把位偏移的数字提示
	setFretOffset(svg, fret, fretOffset, isBarreCover) {
		if (fret > 0) {
			let text = this.createSVG('text', {
				className: 'chord-barre-fret',
				x: isBarreCover ? 1 : 8,
				y: 40 + fret * 20
			});
			text.innerHTML = fretOffset;
			svg.appendChild(text);
		}
	}
	// 设置每根弦在按住和弦后的发音名
	setStringKey(svg, string, keyName) {
		let xFixed = keyName.length === 2 ? -4 : 0;
		let text = this.createSVG('text', {
			className: 'chord-string-key',
			x: 21.5 + 20 * (6 - string) + xFixed,
			y: 160
		});
		text.innerHTML = keyName;
		svg.appendChild(text);
	}
	// 设置和弦名称
	setChordName(svg, name = '') {
		let xFixed = /\.\.\./.test(name) ? 10 : 0;
		let text = this.createSVG('text', {
			className: 'chord-name',
			x: 75 - name.toString().length * 7 + xFixed,
			y: 20
		});
		text.innerHTML = name;
		svg.appendChild(text);
	}
	// 初始化svg
	initChordSvg() {
		// svg元素
		this.svg = this.createSVG('svg', {
			className: 'chord-svg',
			viewBox: '0 0 150 150',
			preserveAspectRatio: 'xMidYMin meet'
		});
		// 和弦图方块
		this.chordRect = this.createSVG('rect', {
			className: 'chord-rect',
			x: 25,
			y: 45,
			rx: 5,
			ry: 5
		});
		// 和弦网格，代表弦和品
		this.chordGird = this.createSVG('path', {
			className: 'chord-gird',
			d: 'M25 65 L125 65 M25 85 L125 85 M25 105 L125 105 M25 125 L125 125 M45 45 L45 145 M65 45 L65 145 M85 45 L85 145 M105 45 L105 145 M25 40 L125 40'
		});
		// 用于放置可复用的svg元素
		this.defs = this.createSVG('defs');
		// 禁止按弦的叉号标志
		this.g_forbidden = this.createSVG('g', {
			id: 'forbidden'
		});
		this.g_forbidden.appendChild(this.createSVG('path', {
			className: 'chord-forbidden',
			d: 'M-5 -5 L5 5 M-5 5 L5 -5'
		}));
		// 空弦弹奏的空心圈标志
		this.g_blank_circle = this.createSVG('g', {
			id: 'blank_circle',

		});
		this.g_blank_circle.appendChild(this.createSVG('circle', {
			className: 'chord-blank-circle',
			cx: 0,
			cy: 0,
			r: 6
		}));
		// 表示按弦位置的实心圈标志
		this.g_block_circle = this.createSVG('g', {
			id: 'block_circle'
		});
		this.g_block_circle.appendChild(this.createSVG('circle', {
			className: 'chord-block-circle',
			cx: 0,
			cy: 0,
			r: 8
		}));
		// 可复用元素加入
		this.defs.appendChild(this.g_forbidden);
		this.defs.appendChild(this.g_blank_circle);
		this.defs.appendChild(this.g_block_circle);
		// svg子元素加入
		this.svg.appendChild(this.chordRect);
		this.svg.appendChild(this.chordGird);
		this.svg.appendChild(this.defs);
	}
	// 绘制和弦svg图案
	/*
	 * @param chordTone 和弦组成音数组
	 * @param chord 和弦指法结果
	 * @param target svg指法图dom容器
	 */
	drawChord(chordTone, chord, target) {
		let svg = this.svg.cloneNode(true);
		let fretArr = chord.map(item => item.fret).filter(fret => (fret != null));
		// 和弦指法中出现的最高品格位置
		let maxFret = Math.max.apply(null, fretArr);
		// 和弦指法中出现的最低品位位置
		let minFret = Math.min.apply(null, fretArr);
		// svg指法图案的起始品格位置相对于吉他上0品位置的偏移量
		let fretOffset = maxFret <= 5 ? 0 : minFret;
		// 记录指法最低品位可能需要大横按的按弦数
		let barreCount = 0;
		// 大横按初始只横跨1弦到1弦（相当于没横按）
		let barreStringTo = 1;
		// 实例化用于计算和弦名称的类
		let chordName = new ChordName();
		// 遍历和弦指法数组
		chord.forEach((item) => {
			if (item.fret == null) {
				// 某根弦没标记品格位置时禁止该弦弹奏
				this.setForbidden(svg, item.string);
			} else if (item.fret === 0) {
				// 某根弦没标记的品格位置为0品时标记空弦弹奏
				this.setOpen(svg, item.string);
			} else {
				// 剩下的指法绘制其对应的按法位置
				this.setFinger(svg, item.string, fretOffset > 0 ? item.fret - fretOffset + 1 : item.fret);
			}
			// 当按在该和弦的最低品格位置的指法反复出现时
			if (item.fret === minFret) {
				// 计算大横按的跨度
				barreStringTo = item.string > barreStringTo ? item.string : barreStringTo;
				// 计算大横按实际按弦的数量
				barreCount++;
			}
			// 在允许弹奏的弦的下方标记其对应的音名
			if (item.fret != null) {
				this.setStringKey(svg, item.string, chordName.getKeyName(item.key));
			}
		});
		// 将真实的按弦品格位置转换为相对于svg图案上的品格位置
		let relativeFret = fretOffset > 0 ? minFret - fretOffset + 1 : minFret;
		if (barreCount > 1) {
			// 横按数大于1才需要使用大横按
			this.setBarre(svg, barreStringTo, relativeFret, minFret);
		}
		// 在图案左侧绘制品格位置偏移标记
		this.setFretOffset(svg, relativeFret, minFret, barreStringTo === 6);
		// 在图案上侧绘制和弦名称
		this.setChordName(svg, chordName.getChordName(chordTone));
		// 将生成号的svg图案塞到指定结构中
		target ? target.appendChild(svg) : document.body.appendChild(svg);
	}
}

module.exports = {
	Tone: Tone,
	GuitarChord: GuitarChord,
	ChordName: ChordName,
	ChordSvg: ChordSvg
}


// 示例
// let chord = new GuitarChord();
// let chordTone = ['1', '3', '5'];
// let chordResult = chord.chord(chordTone);
// let svg = new ChordSvg();
// chordResult.forEach((chordItem) => {
// 	svg.drawChord(chordTone, chordItem);
// });