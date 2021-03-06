import { $terminalTitle } from './elements';
import directories from './directories';

export let Directory = {};
Directory.current = '~';
Directory.currentDirObject = directories[Directory.current];
Directory.prev = '';
Directory.prevDirObject = null;

Directory.setCurrentDirectory = function(path, dirObject) {
    if(path.indexOf(Directory.current) < 0 && path.indexOf('~') != 0) {
        path = Directory.current + '/' + path;
    }
    Directory.prev = Directory.current;
    Directory.prevDirObject = Directory.currentDirObject;
    Directory.current = path;
    Directory.currentDirObject = dirObject || Directory.parseDir(path);
    $terminalTitle.html(path);
};

Directory.goBack = function() {
    Directory.setCurrentDirectory(Directory.prev, Directory.prevDirObject);
};

Directory.parseDir = function(path) {
    let parts = path.split('/');
    let dir = directories;
    if(parts[0] != '~')
        dir = Directory.currentDirObject;

    // loop through each part of directory
    for(let i = 0; i < parts.length; i++) {
        let part = parts[i].trim().toLowerCase();
        if(part == '' || part == '.') 
            continue;
        if(dir[part] == undefined)
            throw new Error(path+': No such file or directory');
        dir = dir[part];
    }
    return dir;
};

Directory.generateContents = function(path) {
    let output = '';
    let dir = Directory.parseDir(path);
    const columnWidth = 20;

    // loop through the items in the directory
    if(!dir.items)
        throw new Error(path + ': No such directory');
    for(let i = 0; i < dir.items.length; i++) {
        const item = dir.items[i];
        output += `<a href="#" data-command="open ${path}/${item}">${item}</a>`;
        if(i % 2 && i != 0 && i != dir.items.length-1) {
            output += '\n';
        } else {
            output += " ".repeat(columnWidth - dir.items[i].length);
        }
    }
    return output;
};
