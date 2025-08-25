// Video metadata configuration for Reverence Studios 2025 Recital
// This maps the actual video files in Backblaze B2 to the system

module.exports = {
  recital2025: {
    // Full recital videos with quality options
    fullRecital: {
      highQuality: {
        title: "Full Recital 2025 - High Quality",
        filePath: "recital-2025/full/recital_2025_hq.mp4",
        quality: "1080p",
        fileSize: "3.4GB",
        duration: "2:30:00"
      },
      standardQuality: {
        title: "Full Recital 2025 - Standard Quality",
        filePath: "recital-2025/full/recital_2025_standard.mp4",
        quality: "720p",
        fileSize: "1.9GB",
        duration: "2:30:00"
      }
    },

    // Individual dance performances (38 total from Backblaze)
    dances: [
      {
        id: 1,
        title: "Princess Jasmine",
        category: "Acro 1",
        filePath: "recital-2025/dances/acro-1__princess-jasmine.mp4",
        fileSize: "113.5MB",
        performers: "Acro Level 1",
        order: 1
      },
      {
        id: 2,
        title: "Live Like You're Loved",
        category: "Acro 2",
        filePath: "recital-2025/dances/acro-2__live-like-your-loved.mp4",
        fileSize: "72.6MB",
        performers: "Acro Level 2",
        order: 2
      },
      {
        id: 3,
        title: "Lift My Eyes",
        category: "Acro 3",
        filePath: "recital-2025/dances/acro-3__lift-my-eyes.mp4",
        fileSize: "63.4MB",
        performers: "Acro Level 3",
        order: 3
      },
      {
        id: 4,
        title: "Strength and Power",
        category: "Acro 4",
        filePath: "recital-2025/dances/acro-4__strength-and-power.mp4",
        fileSize: "89.1MB",
        performers: "Acro Level 4",
        order: 4
      },
      {
        id: 5,
        title: "Goodness of God",
        category: "Ballet 2",
        filePath: "recital-2025/dances/ballet-2__goodness-of-god.mp4",
        fileSize: "81.4MB",
        performers: "Ballet Level 2",
        order: 5
      },
      {
        id: 6,
        title: "Light Up the Sky",
        category: "Ballet 3",
        filePath: "recital-2025/dances/ballet-3__light-up-the-sky.mp4",
        fileSize: "73.0MB",
        performers: "Ballet Level 3",
        order: 6
      },
      {
        id: 7,
        title: "Now Still Waters",
        category: "Ballet 4",
        filePath: "recital-2025/dances/ballet-4__now-still-waters.mp4",
        fileSize: "78.8MB",
        performers: "Ballet Level 4",
        order: 7
      },
      {
        id: 8,
        title: "White Flowers Take Their Bath",
        category: "Ballet 5",
        filePath: "recital-2025/dances/ballet-5__white-flowers-take-their-bath.mp4",
        fileSize: "70.9MB",
        performers: "Ballet Level 5",
        order: 8
      },
      {
        id: 9,
        title: "How Can You Not",
        category: "Contemporary 2",
        filePath: "recital-2025/dances/contemporary-2__how-can-you-not.mp4",
        fileSize: "74.7MB",
        performers: "Contemporary Level 2",
        order: 9
      },
      {
        id: 10,
        title: "Lie Down",
        category: "Contemporary 3",
        filePath: "recital-2025/dances/contemporary-3__lie-down.mp4",
        fileSize: "94.2MB",
        performers: "Contemporary Level 3",
        order: 10
      },
      {
        id: 11,
        title: "The Mountain Is You",
        category: "Contemporary 4",
        filePath: "recital-2025/dances/contemporary-4__the-mountain-is-you.mp4",
        fileSize: "67.4MB",
        performers: "Contemporary Level 4",
        order: 11
      },
      {
        id: 12,
        title: "Edelweiss",
        category: "Special Performance",
        filePath: "recital-2025/dances/edelwise.mp4",
        fileSize: "52.7MB",
        performers: "Special Performance",
        order: 12
      },
      {
        id: 13,
        title: "The Story I'll Tell",
        category: "Graduating Seniors",
        filePath: "recital-2025/dances/graduating-seniors__the-story-ill-tell.mp4",
        fileSize: "130.0MB",
        performers: "Graduating Seniors",
        order: 13
      },
      {
        id: 14,
        title: "Remix",
        category: "Hip Hop",
        filePath: "recital-2025/dances/hip-hop__remix.mp4",
        fileSize: "60.0MB",
        performers: "Hip Hop",
        order: 14
      },
      {
        id: 15,
        title: "I Will Go Where You Go",
        category: "Homeschool Ballet 1",
        filePath: "recital-2025/dances/homeschool-ballet-1__i-will-go-where-you-go.mp4",
        fileSize: "55.8MB",
        performers: "Homeschool Ballet 1",
        order: 15
      },
      {
        id: 16,
        title: "Genesis 1",
        category: "Homeschool Ballet 2",
        filePath: "recital-2025/dances/homeschool-ballet-2__genesis-1.mp4",
        fileSize: "63.9MB",
        performers: "Homeschool Ballet 2",
        order: 16
      },
      {
        id: 17,
        title: "Glory Hour",
        category: "Homeschool Contemporary 2-3",
        filePath: "recital-2025/dances/homeschool-contemporary-2-3__glory-hour.mp4",
        fileSize: "52.2MB",
        performers: "Homeschool Contemporary 2-3",
        order: 17
      },
      {
        id: 18,
        title: "Perfectly Loved",
        category: "Jazz 2",
        filePath: "recital-2025/dances/jazz-2__perfectly-loved.mp4",
        fileSize: "74.4MB",
        performers: "Jazz Level 2",
        order: 18
      },
      {
        id: 19,
        title: "Voices",
        category: "Jazz 3",
        filePath: "recital-2025/dances/jazz-3__voices.mp4",
        fileSize: "61.4MB",
        performers: "Jazz Level 3",
        order: 19
      },
      {
        id: 20,
        title: "God of All Nations",
        category: "Monday Pre-Primary Ballet",
        filePath: "recital-2025/dances/monday-pre-primary-ballet__god-of-all-nations.mp4",
        fileSize: "67.5MB",
        performers: "Monday Pre-Primary Ballet",
        order: 20
      },
      {
        id: 21,
        title: "Life's a Happy Song",
        category: "Monday Primary Tap",
        filePath: "recital-2025/dances/monday-primary-tap__lifes-a-happy-song.mp4",
        fileSize: "58.8MB",
        performers: "Monday Primary Tap",
        order: 21
      },
      {
        id: 22,
        title: "Fire",
        category: "Pointe 1",
        filePath: "recital-2025/dances/pointe-1__fire.mp4",
        fileSize: "76.1MB",
        performers: "Pointe Level 1",
        order: 22
      },
      {
        id: 23,
        title: "Swan Lake Act 1",
        category: "Pointe 2",
        filePath: "recital-2025/dances/pointe-2__swan-lake-act-1.mp4",
        fileSize: "55.8MB",
        performers: "Pointe Level 2",
        order: 23
      },
      {
        id: 24,
        title: "Sesame Street",
        category: "Saturday AM Tap",
        filePath: "recital-2025/dances/saturday-am-tap__sesame-street.mp4",
        fileSize: "42.9MB",
        performers: "Saturday AM Tap",
        order: 24
      },
      {
        id: 25,
        title: "Rainbow Connection",
        category: "Saturday Primary Ballet",
        filePath: "recital-2025/dances/saturday-primary-ballet__rainbow-connection.mp4",
        fileSize: "73.8MB",
        performers: "Saturday Primary Ballet",
        order: 25
      },
      {
        id: 26,
        title: "Made for This",
        category: "Student Leaders",
        filePath: "recital-2025/dances/student-leaders__made-for-this.mp4",
        fileSize: "95.4MB",
        performers: "Student Leaders",
        order: 26
      },
      {
        id: 27,
        title: "Breakthrough",
        category: "Tap 2",
        filePath: "recital-2025/dances/tap-2__breakthrough.mp4",
        fileSize: "69.9MB",
        performers: "Tap Level 2",
        order: 27
      },
      {
        id: 28,
        title: "Holding",
        category: "Tap 3",
        filePath: "recital-2025/dances/tap-3__holding.mp4",
        fileSize: "71.6MB",
        performers: "Tap Level 3",
        order: 28
      },
      {
        id: 29,
        title: "Hit Me Up",
        category: "Tap 3 (Alternative)",
        filePath: "recital-2025/dances/tap3__hit-me-up.mp4",
        fileSize: "57.1MB",
        performers: "Tap Level 3",
        order: 29
      },
      {
        id: 30,
        title: "Revolting Children",
        category: "Theater Dance",
        filePath: "recital-2025/dances/theater-dance__revolting-children.mp4",
        fileSize: "62.6MB",
        performers: "Theater Dance",
        order: 30
      },
      {
        id: 31,
        title: "Holy Holy Holy",
        category: "Tuesday AM Ballet",
        filePath: "recital-2025/dances/tuesday-am-ballet__holy-holy-holy.mp4",
        fileSize: "63.2MB",
        performers: "Tuesday AM Ballet",
        order: 31
      },
      {
        id: 32,
        title: "Lollipop",
        category: "Tuesday Tap 1",
        filePath: "recital-2025/dances/tuesday-tap-1__lollipop.mp4",
        fileSize: "59.4MB",
        performers: "Tuesday Tap 1",
        order: 32
      },
      {
        id: 33,
        title: "Spoonful of Sugar",
        category: "Wednesday AM Primary Ballet",
        filePath: "recital-2025/dances/wedenesday-am-primary-ballet__spoonful-of-sugar.mp4",
        fileSize: "49.5MB",
        performers: "Wednesday AM Primary Ballet",
        order: 33
      },
      {
        id: 34,
        title: "I Got a Dream",
        category: "Wednesday AM Acro Jazz",
        filePath: "recital-2025/dances/wednesday-am-acro-jazz__I-got-a-dream.mp4",
        fileSize: "63.6MB",
        performers: "Wednesday AM Acro Jazz",
        order: 34
      },
      {
        id: 35,
        title: "El Shaddai",
        category: "Wednesday AM Primary Ballet (2)",
        filePath: "recital-2025/dances/wednesday-am-primary-ballet__el-shaddai.mp4",
        fileSize: "51.6MB",
        performers: "Wednesday AM Primary Ballet",
        order: 35
      },
      {
        id: 36,
        title: "Beyond",
        category: "Wednesday Pre-Primary Ballet",
        filePath: "recital-2025/dances/wednesday-pre-primary-ballet__beyond.mp4",
        fileSize: "53.3MB",
        performers: "Wednesday Pre-Primary Ballet",
        order: 36
      },
      {
        id: 37,
        title: "Story of the Cross",
        category: "Wednesday Primary Ballet",
        filePath: "recital-2025/dances/wednesday-primary-ballet__story-of-the-cross.mp4",
        fileSize: "74.3MB",
        performers: "Wednesday Primary Ballet",
        order: 37
      },
      {
        id: 38,
        title: "Abandoned",
        category: "Worship Dance",
        filePath: "recital-2025/dances/worship-dance__abandoned.mp4",
        fileSize: "87.9MB",
        performers: "Worship Dance",
        order: 38
      }
    ]
  }
};
