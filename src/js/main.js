import $ from 'jquery';
import KeyCodes from './keyCodes';
import { htmlEntities } from './helpers';
import changeBgColor from './bgColorSystem';
import TerminalHistory from './terminalHistory';
import { Directory } from './directorySystem';
import { processCommand } from './commandSystem';
import { $terminalWindow, $terminalOutput, $commandInput } from './elements';

const main = function() {
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

    $('nav a').on('click', function(e) {
        e.preventDefault();
        openPage($(this).data('page'));
    });

    $('.terminal .buttons div').on('click', changeBgColor);
};

// start up
main();

const openPage = function(page) {
    switch(page) {
        case 'home':
            triggerCommand('cd ~');
            break;
        case 'projects':
        case 'about':
        case 'resume':
        case 'contact':
            let prefix = Directory.current != '~' ? '~/' : '';
            triggerCommand('open ' + prefix + page);
            break;
    }
    if(page != 'resume' && $(window).width() < 500) {
        $('html, body').animate({
            scrollTop: $('nav').offset().top
        }, 500);
    }
}

const triggerCommand = function(command) {
    $commandInput.val(command);
    handleEnter(command);
}

const handleEnter = function(value) {
    TerminalHistory.clearDownInputStack();
    handleInput(value);
    $terminalWindow.scrollTop($terminalWindow.height() + $terminalOutput.height());
};

const handleInput = function(input) {
    let output;
    input = htmlEntities(input);

    try {
        output = processCommand(input);
    } catch(e) {
        output = e.message;
    }

    $commandInput.val('');
    let fullOutput = '$ ' + input + '\n';
    if(output.length > 0 && output != false && typeof output != 'function') {
        let text = '';
        if($terminalOutput.text() != '') {
            text = '\n'
        }
        fullOutput += output + '\n';
    }
    if(output != false) {
        $terminalOutput.append(fullOutput);
    }

    if(typeof output == 'function') {
        output.call();
    }

    if(input.length > 0) {
        TerminalHistory.stack.up.push(input);
    }
};