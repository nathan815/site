import $ from 'jquery';

const terminalWindow = $('#window');
const command = $('#command');

terminalWindow.on('click', function() {
    command.focus();
});