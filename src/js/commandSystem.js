import { AllCommands } from './commands';
import { arrHas } from './helpers';
import cookies from 'browser-cookies';

export const COMMAND_COOKIE_ARR_DIVIDER = ';__;';

export const processCommand = function(input) {
    input = input.trim();
    if(input == '')
        return '';
    let parts = input.split(' ');
    // remove blank "parts" so double spaces don't screw things up
    for(let i = 0; i < parts.length; i++) {
        if(parts[i].trim() == '')
            parts.splice(i, 1);
    }
    const commandName = parts[0];
    const command = AllCommands[commandName];
    const options = [];
    const args = [];

    if(command === undefined) {
        throw new Error('-bash: '+commandName+': command not found');
    }

    parts = parts.splice(1);
    // parse options and arguments
    for(let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if(part.indexOf('--') == 0 || part.indexOf('-') == 0) {
            // get rid of the leading dashes
            part = part.indexOf('--') == 0 ? part.slice(2) : part.slice(1);
            // make sure option is possible
            if(!arrHas(command.possibleOptions, part)) {
                throw new Error(commandName + ' - Unknown option: '+part);
            }
            options.push(part);
        }
        else {
            args.push(part);
        }
    }

    // set last command in cookie
    let lastCommands = cookies.get('lastCommands') || '';
    lastCommands = lastCommands.split(COMMAND_COOKIE_ARR_DIVIDER);
    lastCommands.push(input);
    cookies.set('lastCommands', lastCommands.join(COMMAND_COOKIE_ARR_DIVIDER));

    // console.log("ops=",options);
    // console.log("args=",args);

    let commandResult = command.execute(options, args, input);
    return commandResult ? commandResult : '';
};