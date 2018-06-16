import React, {
	Component
} from 'react';
import './App.css';
import ChordSelect from './component/chordSelect';
import ChordDraw from './component/chordDraw';

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {

		}
	}
	hideLoading() {
		this.refs.chordSelect.hideLoading();
	}
	selectFinish(chordTone) {
		this.refs.chordDraw.draw(chordTone);
	}
	render() {
		return (
			<div className="App">
				<ChordSelect ref="chordSelect" selectFinish={this.selectFinish.bind(this)}/>
				<ChordDraw ref="chordDraw" hideLoading={this.hideLoading.bind(this)}/>
			</div>
		);
	}
}

export default App;