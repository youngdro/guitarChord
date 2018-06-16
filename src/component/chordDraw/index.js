import React, {
	Component
} from 'react';
import './index.css';
import {
	GuitarChord,
	ChordName,
	ChordSvg
} from '../../guitarChord.js';
class ChordDraw extends Component {
	constructor(props) {
		super(props);
		this.state = {
			info: "",
		}
		this.info = {
			hasAnswer: [
				"你没看错，这是和弦",
				"bingo",
				"",
				"你有音乐天赋",
				"没想到被你发现了",
				"我看你骨骼清奇，不如",
				"和弦常有，一拖能拖出和弦的人不常有",
				"是胜利的味道",
				"试的久了，就会找到规律",
				"贝多芬承认这是和弦",
				"嗯，这是和弦"
			],
			hasSvg: [
				"叫不出名字，但指法还是有的",
				"无名氏小心翼翼作图如下",
				"将就着看看指法吧",
				"在下尽力了",
				"【省略号脸】",
				"这只能勉强画个图( ˙-˙ )",
				"只能帮你到这儿了",
				"哇塞这些音居然有指法",
				"不知道该怎么称呼它(°ー°〃)",
				"有图，但没真相",
				"在下才疏学浅，叫不出它的名字",
				"实为古怪，却又按得出来"
			],
			noAnswer: [
				"你这和弦让人费解",
				"组成音太诡异，透露着没图没真相的气息",
				"kidding?",
				"你来到了和弦的荒原",
				"是在下输了",
				"你可能输入了一个假和弦",
				"请换个口味",
				"在下不懂，空白如斯",
				"不存在的",
				"我知道这大概率是不对的",
				"勇士请再试试别的",
				"音之间靠的太远太近都成不了和弦，这大概是哲学",
				"是离愁，别是一番滋味在心头",
				"这和弦假得指法都画不出",
				"和弦闹不和，分手了，请撮合下一组",
				"认真一点，你确实这是和弦？",
				"全都是泡沫",
				"这只是一霎花火",
				"......",
				"这啥 (╯‵□′)╯︵┻━┻",
				"无解 (´-ι_-｀)",
				"还是无解 _(:з」∠)_",
				"真的勇士，敢于再试一次",
				"这是正儿八经的推导，但你的题目有问题",
				"要知道正确的和弦在排列组合里毕竟是少数",
				"要不再试试间隔较均匀的音？",
				"和弦懵逼",
				"线性懵逼",
				"贝塞尔曲线懵逼",
				"递归懵逼",
				"这不是文字游戏，如果你信的话",
				"贝多芬不承认这是和弦",
				"默默装作不知道发生了什么"
			],
		}
	}
	randomOne(arr) {
		return arr[Math.floor(Math.random() * arr.length)];
	}
	draw(chordTone) {
		let chord = new GuitarChord();
		let chordName = new ChordName().getChordName(chordTone);
		let chordResult = chord.chord(chordTone);
		let svg = new ChordSvg();
		let container = document.getElementById("chord_draw");
		container.innerHTML = "";

		setTimeout(() => {
			this.props.hideLoading();
		}, 200);
		setTimeout(() => {
			if (chordResult.length === 0) {
				this.setState({
					info: this.randomOne(this.info.noAnswer)
				});
			} else if (/\.\.\./.test(chordName)) {
				this.setState({
					info: this.randomOne(this.info.hasSvg)
				});
			} else {
				this.setState({
					info: this.randomOne(this.info.hasAnswer)
				});
			}
			chordResult.forEach((chordItem) => {
				svg.drawChord(chordTone, chordItem, document.getElementById("chord_draw"));
			});
		}, 500);

	}
	render() {
		return (
			<div className="container-chordDraw">
				<div className={"draw-info"+(this.state.info?" show":"")}>{this.state.info}</div>
        		<div id="chord_draw"></div>
      		</div>
		);
	}
}

export default ChordDraw;