import React from 'react';
import {registerRoot} from 'remotion';
import {Root} from './Root';
import {NotebookComposition} from './Notebook';
registerRoot(()=>React.createElement(React.Fragment,null,React.createElement(Root),React.createElement(NotebookComposition)));
