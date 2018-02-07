import { AllCommands, GenericOptions } from './commands';

export const processCommand = function(input) {
    let parts = input.split(' ');
    const commandName = parts[0];
    const command = AllCommands[commandName];
    const options = [];
    const args = [];

    if(command === undefined) {
        throw new Error('bash - Unknown commmand: ' + commandName);
    }

    parts = parts.splice(1);
    // parse options and arguments
    for(let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if(part.indexOf('--') == 0 || part.indexOf('-') == 0) {
            // get rid of the leading dashes
            part = part.indexOf('--') == 0 ? part.slice(2) : part.slice(1);
            // make sure option is possible
            if(command.possibleOptions.indexOf(part) == -1 && GenericOptions.indexOf(part) == -1) {
                throw new Error(commandName + ' - Unknown option: '+part);
            }
            options.push(part);
        }
        else {
            args.push(part);
        }
    }

    if(options.indexOf('h') != -1 || options.indexOf('help') != -1) {
        return 'HELP for ' + commandName + ': ' + command.helpText;
    }
    else {
        return command.execute(options, args, input);
    }
};