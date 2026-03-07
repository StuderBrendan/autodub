const { exec } = require("child_process");
const path = require("path");

function exportDub(videoPath, audioPath, outputPath){

    return new Promise((resolve, reject)=>{

        const command =
        `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -filter_complex amix=inputs=2 "${outputPath}"`;

        exec(command,(err,stdout,stderr)=>{

            if(err){
                reject(err);
            }else{
                resolve();
            }

        });

    });

}

module.exports = { exportDub };