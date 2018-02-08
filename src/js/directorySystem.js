export const DirectoryList = {
    '~': {
        items: [ 'about', 'projects', 'resume', 'contact '],
        projects: {
            items: [ 'EnemyClouds', 'StudentSignIn', 'TheSwanStation', 'FishNet', 'EcoSPAN' ],
            EnemyClouds: {
                items: [ 'hi' ],
                hi: {
                    items: [ 'hello' , 'world']
                }
            }
        }
    }
};

export let Directory = {};
Directory.current = '~';

Directory.generateContents = function(name) {
    let parts = name.split('/');
    let dir = DirectoryList[Directory.current];
    let output = '';

    // if first part is the current directory, remove from the array
    // since dir is already pointing to the current directory
    if(parts[0] == Directory.current)
        parts.shift();

    // loop through each part of directory
    for(let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if(part.trim() == '' || part == '.') 
            continue;
        if(part == '..' && i > -1) {
            dir = dir[parts[i]-1];
            continue;
        }
        if(dir[part] == undefined)
            throw new Error('ls: '+name+': No such directory');
        dir = dir[part];
    }

    // loop through the items in the directory
    for(let i = 0; i < dir.items.length; i++) {
        output += dir.items[i];
        if(i % 2 && i != 0 && i != dir.items.length-1) 
            output += '\n';
        else
            output += '\t\t';
    }
    return output;
}
