import $ from 'jquery';
import createHashHistory from 'history';

import KeyCodes from './keyCodes';
import { htmlEntities } from './helpers';
import TerminalHistory from './terminalHistory';
import { processCommand } from './commandSystem';
import { $terminalWindow, $terminalOutput, $commandInput } from './elements';

$terminalWindow.on('click', function(e) {
    let haveSel = getSelection().toString().length > 0;
    if(!haveSel) {
        $commandInput.focus();
    }
});

$commandInput.on('keydown', function(e) {
    let txt = '';
    switch(e.which) {
        case KeyCodes.ENTER:
            handleEnter(this.value);
            break;
        case KeyCodes.ARROW_UP:
        case KeyCodes.ARROW_DOWN:
            e.preventDefault();
            TerminalHistory.handleHistory(e.which);
            break;
    }
});

const triggerCommand = function(command) {
    $commandInput.val(command);
    handleEnter(val);
}

const handleEnter = function(value) {
    TerminalHistory.clearDownInputStack();
    handleInput(value);
    $terminalWindow.scrollTop($terminalWindow.height() + $terminalOutput.height());
};

const handleInput = function(input) {
    let output = '';
    input = htmlEntities(input);

    try {
        output = processCommand(input);
    } catch(e) {
        output = e.message;
    }

    $commandInput.val('');
    if(output.length > 0) {
        let text = '';
        if($terminalOutput.text() != '') {
            text = '\n'
        }
        text += '$ ' + input + '\n' + output;
        $terminalOutput.append(text);
    }
    if(input.length > 0) {
        TerminalHistory.stack.up.push(input);
    }
};