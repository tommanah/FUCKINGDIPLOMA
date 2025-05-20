import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import './App.css';
import Main from './Main';

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <Main />
      </div>
    </Provider>
  );
}

export default App;
