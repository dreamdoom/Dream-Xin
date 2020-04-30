let vm = new Vue({
    el: '#app',
    data() {
        return {
            searchKeyWords: "",     // 搜索列表关键字
            playKeyWords: "",       // 播放列表的关键字
            keywords: "程响",
            inputValue: "",
            musicTitle: "舞动音符♫♫♫",     // 用于顶部显示正在播放的音乐的名称
            songs: [],      // 当前显示的歌曲对象列表
            musicIds: [],   // 当前显示的歌曲ID列表
            searchMusicObjectList: [],     // 暂存搜索框搜索出的音乐对象列表
            searchMusicIdList: [],     // 暂存搜索框搜索出的音乐ID列表
            playMusicObjectList: [],      // 暂存播放列表的歌曲（歌曲对象）
            playMusicIdList: [],      // 存储当前播放的歌曲列表（歌曲ID）
            tempMusicObjectList: [],    // 暂存搜索框动态音乐对象数据
            tempMusicIdList: [],     // 暂存搜索框动态音乐ID数据
            selectSearch: true,
            musicUrl: '',   // 当前播放的音乐的URL地址
            bgcImg: {       // 歌曲专辑图片
                background: "",
                position: 'relative'
            },
            musicPage: 0,       // 歌曲偏移量
            commentPage: 0,     // 评论偏移量
            comments: [],   // 存放评论内容
            currentMusicId: 0,  // 当前播放的音乐ID
            isPause: true,      // 当前是否暂停
            musicIndex: -1,      // 记录当前播放的音乐在音乐列表的索引，方便切换歌曲
            hasResource: true,   // 当前歌曲是否有资源（可播放）
            musicProgress: 0,   // 音乐进度条
            volumeProgress: 20,     // 音量进度条
            timeInterval: null,     // 定时器
            currentTime: "00:00",   // 当前播放到的时间点
            duration: "00:00",      // 音乐的总时长
            isLoop: false,      // 是否单曲循环播放音乐
            showVolumeBar: false,   // 是否显示音量控制条
            isMuted: false,      // 是否静音
            noPlay: true,       // 记录当前是否有歌曲在播放任务中，如果没有那么播放/暂停/上一首/下一首将被禁用
            scrolling: false,    // 当前是否正在触发scroll触底请求，如果是那么将禁止请求的过程中进行重复请求
            focused: false,
            rotate: {
                '-webkit-animation': 'circle 2s infinite linear',
                '-moz-animation': 'circle 2s infinite linear',
                '-ms-animation': 'circle 2s infinite linear',
                '-o-animation': 'circle 2s infinite linear',
                animation: 'circle 2s infinite linear',
                animationPlayState: 'running',
            },
            linearBackground: {
                background: "linear-gradient(to left, cornsilk, #70f7fe, #bfb5dd, cornflowerblue)",
                color: "black"
            },
            blured: null,
            musicWords: [],
            wordsIndex: 0,
            wordStyle: {
                color: 'cornflowerblue',
                fontSize: '28px',
                background: 'rgba(245,255,255, 0.6)'
            },
            timer: null,
            controlTimer: null,
        }
    },
    created() {
        this.inputValue = this.keywords;
        this.searchKeyWords = this.keywords;
    },
    mounted() {     // 初始化处理
        this.bgcImg.background = `url(https://ss2.bdstatic.com/70cFvnSh_Q1YnxGkpoWK1HF6hhy/it/u=330819873,1129487657&fm=26&gp=0.jpg) 0% 0% / cover no-repeat`
        this.$refs.audio.volume = 0.2;
        this.$refs.playControl.style.marginBottom = '-50px';
        playControlAnimation.apply(this, [true]);
        this.searchMusic('inputSearch');
        window.sessionStorage.setItem("playScrollPosition", '0');
    },
    watch: {
        // 监听搜索框的数据变化，实时发送请求获取对应的数据并进行显示
        // 需要对事件处理函数进行防抖处理，防止瞬间触发多次事件影响性能
        inputValue: (function () {
            let timeout=null;
            return function() {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    axios.get(`https://autumnfish.cn/search?keywords=${this.inputValue}`)
                        .then(res => {
                            this.tempMusicObjectList = [];
                            this.tempMusicIdList = [];
                            let songs = res.data['result']['songs'];
                            for (let song of songs) {
                                let res = getMusicObj(song)
                                this.tempMusicObjectList.push(res[0]);
                                this.tempMusicIdList.push(res[1]);
                            }
                        })
                }, 500)
            }
        })()
    },
    methods: {
        // 搜索音乐
        searchMusic(type) {
            // 可能触发搜索的情况（type的四种可能的取值）：
            // 1、播放列表滚动条触底 => addPlayMusic
            // 2、搜索列表滚动条触底 => addSearchMusic
            // 3、同过点击搜索按钮或聚焦输入框后按回车键 => inputSearch
            // 4、在当前播放的音乐为底部最后一首音乐时点击下一首进行切歌 => nextMusic
            if (type === "inputSearch") this.keywords = this.inputValue;
            axios.get(`https://autumnfish.cn/search?keywords=${this.keywords}&offset=${this.musicPage}`)
                .then(res => {
                    let songs = res.data['result']['songs'];
                    if (songs) {
                        if (type === "inputSearch" || type === "addSearchMusic") {
                            // 当前搜索是由搜索框发起，此时应进行初始化操作
                            if (type === "inputSearch") {
                                this.songs = [];
                                this.searchKeyWords = this.inputValue;
                                this.selectSearch = true;
                                // 2、清空搜索列表歌曲对象
                                this.searchMusicObjectList = [];
                                // 3、清空搜索列表歌曲ID
                                this.searchMusicIdList = [];
                                this.$refs.musicItemsScroll.scrollTop = 0;
                            }
                            if (type === "addSearchMusic") this.scrolling = false;
                            for (let song of songs) {
                                res = getMusicObj(song)
                                this.searchMusicObjectList.push(res[0]);
                                this.searchMusicIdList.push(res[1]);
                            }
                            this.songs = deepCopy(this.searchMusicObjectList);
                            this.musicIds = deepCopy(this.searchMusicIdList);
                        }  else if (type === "addPlayMusic" || type === "nextMusic") {
                            for (let song of songs) {
                                res = getMusicObj(song);
                                this.playMusicObjectList.push(res[0]);
                                this.playMusicIdList.push(res[1]);
                                this.songs.push(res[0])
                                this.musicIds.push(res[1])
                            }
                            this.scrolling = false;
                        }
                        // 点击下一首进行切歌的时候超出列表范围时会调用搜索歌曲的方法进行更多音乐数据的
                        // 请求，获取到音乐数据后调用播放接口播放第一首最新的音乐
                        if (type === "nextMusic") {
                            this.musicIndex++;
                            this.playMusic(this.playMusicIdList[this.musicIndex])
                        }
                    }
                })
        },
        // 播放音乐
        playMusic(musicId, index=-1, type, musicTitle) {
            this.noPlay = false;
            this.musicTitle = musicTitle;
            if (index !== this.musicIndex) this.$refs.musicWordsWrap.scrollTop = '250px';
            // 在搜索列表点击歌曲进行播放
            if (this.selectSearch && type === "clickMusic") {
                this.songs = deepCopy(this.searchMusicObjectList);
                this.musicIds = deepCopy(this.searchMusicIdList);
                this.playMusicObjectList = deepCopy(this.songs);
                this.playMusicIdList = deepCopy(this.musicIds);
                this.playKeyWords = this.searchKeyWords;
                this.keywords = this.playKeyWords;
                window.sessionStorage.setItem("searchScrollPosition", this.$refs.musicItemsScroll.scrollTop.toString());
            } else if (type === "clickSearchInputResult") {
                this.focused = false;
                if (index === this.musicIndex && this.inputValue === this.playKeyWords) {
                    return;
                }
                if (this.inputValue !== this.playKeyWords) {
                    // 当搜索框中的内容改变时再次点击结果集中的音乐才会更新以下数据
                    // 否则只会调整播放列表中滚动条的位置以锁定该音乐
                    this.playMusicObjectList = deepCopy(this.tempMusicObjectList);
                    this.playMusicIdList = deepCopy(this.tempMusicIdList);
                    this.playKeyWords = this.inputValue;
                    this.keywords = this.playKeyWords;
                }
                this.musicIndex = index
                this.selectSearch = true;
                this.returnMusicItem();
                this.selectSearch = true;

            }
            playControlAnimation.apply(this, [type !== "prevMusic" && type !== "nextMusic"]);
            this.currentMusicId = musicId;
            if (index !== this.musicIndex || this.selectSearch) {
                if (type === "clickMusic" || type === "clickSearchInputResult") this.selectSearch = false;
                this.musicProgress = 0;
                this.currentTime = "00:00";
                this.duration = "00:00";
                if (index !== -1) this.musicIndex = index;
                axios.get(`https://autumnfish.cn/song/url?id=${musicId}`)
                    .then(res => {
                        // 获取音乐的地址
                        this.musicUrl = res.data.data[0].url;
                        // 清除定时器
                        clearInterval(this.timeInterval);
                        if (this.musicUrl) {
                            this.wordsIndex = 0;
                            this.hasResource = true;
                            this.musicWords = getMusicWords(musicId);
                            setTimeout(() => {
                                this.$refs.musicWords.style.top = '300px';
                            }, 0)
                            // 拥有对该音乐的版权，此时可以进行一系列正常操作
                            // 1、设置有版权的信号
                            // 2、将音乐的专辑图片设置为背景图
                            this.setMusicImageUrl();
                            // 3、获取该音乐的评论数据
                            this.getMusicComments();
                            // 4、将暂停状态置为假
                            this.isPause = false;
                            // 5、循环修改进度条的进度和歌词的显示
                            circleAdjustMusicProgressAndMusicWords.apply(this, []);
                        } else {    // 没有对该歌曲的版权
                            // 1、设置无版权的信号
                            this.hasResource = false;
                            // 2、清空评论区
                            this.comments = [];
                            // 3、将歌曲地址置空
                            this.musicUrl = '';
                            // 4、修改此时暂停状态为真
                            this.isPause = true;
                        }
                    })
            }
        },
        // 点击顶部音乐名称或音乐专辑图片后在音乐播放列表锁定该音乐
        returnMusicItem() {
            playControlAnimation.apply(this, [true]);
            this.showPlayList();
            setTimeout(() => {
                if (this.musicIndex >= 9) {
                    vm.$refs['musicItemsScroll'].scrollTop = 50 * (this.musicIndex - 4);
                } else {
                    vm.$refs['musicItemsScroll'].scrollTop = 0;
                }
            }, 0)
        },
        // 获取歌曲详情，拿到歌曲图片地址并渲染图片
        setMusicImageUrl() {
            axios.get(`https://autumnfish.cn/song/detail?ids=${this.currentMusicId}`)
                .then(res => {
                    this.bgcImg.background = `url(${res.data.songs[0]['al']['picUrl']}) 0% 0% / cover no-repeat`;
                })
        },
        // 获取歌曲评论
        getMusicComments(type) {
            axios.get(`https://autumnfish.cn/comment/music?id=${this.currentMusicId}&offset=${this.commentPage}`)
                .then(res => {
                    // 如果该页评论不为最后一页就更新评论区
                    if (res.data['comments'].length > 0) {
                        if (type !== "addComment") this.comments = []
                        for (let comment of res.data['comments']) {
                            this.comments.push({name: comment.user['nickname'], content: comment.content});
                        }
                    }
                })
        },
        // 暂停播放
        pause() {
            this.$refs.audio.pause();
            this.isPause = true;
            // 暂停音乐图标动画
            this.rotate.animationPlayState = "paused";
            this.$refs.musicTitle.style.animationPlayState = "paused";
        },
        // 开始播放
        play() {
            if (this.musicUrl) {
                this.$refs.audio.play();
                this.isPause = false;
                // 开启音乐图标动画
                this.rotate.animationPlayState = "running";
                this.$refs.musicTitle.style.animationPlayState = "running";
            }
        },
        // 播放上一首
        prevMusic() {
            if (!this.noPlay && this.musicIndex > 0) {
                this.musicIndex--;
                this.playMusic(
                    this.playMusicIdList[this.musicIndex],
                    -1,
                    "prevMusic",
                    `${this.playMusicObjectList[this.musicIndex]['musicName']} ---- ${this.playMusicObjectList[this.musicIndex]['artistsName']}`
                );
            }
        },
        // 播放下一首
        nextMusic() {
            if (!this.noPlay) {
                if (this.musicIndex + 1 >= this.musicIds.length) {
                    this.musicPage += 30;
                    this.searchMusic("nextMusic");
                } else {
                    this.musicIndex++;
                    this.playMusic(
                        this.playMusicIdList[this.musicIndex],
                        -1,
                        'nextMusic',
                        `${this.playMusicObjectList[this.musicIndex]['musicName']} ---- ${this.playMusicObjectList[this.musicIndex]['artistsName']}`
                    );
                }
            }
        },
        // 滚动条触底事件更新歌曲和评论列表
        scrollToBottom(type, e) {
            let J = e.target.scrollHeight;  // 内容总高度
            let I = e.target.scrollTop;     // 顶部隐藏的内容高度
            let K = e.target.clientHeight;  // 可是区域高度
            if (J - I - K <= 0) {   // 滑动条已滑倒底部
                if (type === 'music') {    // 当前滑动的是音乐列表滑动条
                    // 修改偏移量并再次发起请求获取接下来的音乐数据
                    this.musicPage += 30;
                    if (this.selectSearch && !this.scrolling) {
                        this.scrolling = true;
                        this.searchMusic("addSearchMusic");
                    } else if (!this.selectSearch && !this.scrolling) {
                        this.scrolling = true;
                        this.searchMusic("addPlayMusic");
                    }
                } else {    // 当前滑动的是评论列表滑动条
                    // 修改偏移量并再次发起请求获取接下来的评论数据
                    this.commentPage += 20;
                    this.getMusicComments("addComment");
                }
            }
        },
        // 手动调整音乐播放进度
        selectProgress(e) {
            // 1、通过e.offsetX获取相对于最左边的偏移量并按比例转化为百分比换算出当前的currentTime
            if (!this.noPlay){
                this.play();
                let currentTime = this.$refs.audio.duration * e.offsetX / parseInt(getComputedStyle(this.$refs.percent)['width']);
                for (let i = 0; i < this.musicWords.length - 1; i++) {
                    if (this.musicWords[i]['time'] <= currentTime && currentTime < this.musicWords[i + 1]['time']) {
                        this.wordsIndex = i;
                        break;
                    } else if (i === this.musicWords.length - 2) {
                        this.wordsIndex = i + 1;
                    }
                }
                this.$refs.musicWordsWrap.scrollTop = 50 * this.wordsIndex
                this.$refs.audio.currentTime = currentTime;
                // 2、修改音乐播放进度条的显示进度
                this.musicProgress = e.offsetX;
                this.currentTime = formatDate(currentTime);
            }
        },
        // 手动调节音量
        changeVolume(e) {
            // 1、通过e.offsetX获取相对于最左边的偏移量并按比例转化为一位小数赋值给audio的音量属性
            this.$refs.audio.volume = Math.ceil(e.offsetX / 10) / 10;
            // 2、调整音量条的进度显示
            this.volumeProgress = Math.ceil(e.offsetX / 10) * 10;
            // 3、不管之前是否为静音状态一律调整为非静音状态
            this.isMuted = false;
        },
        // 选择是否静音
        changeMute() {
            if (!this.isMuted) {
                // 如果当前为非静音状态
                // 1、修改当前状态为静音状态
                this.isMuted = true;
                // 2、将audio播放器音量调为0
                this.$refs.audio.volume = 0;
            } else {
                // 如果当前为静音状态
                // 1、修改当前状态为非静音状态
                this.isMuted = false;
                // 2、依据音量条来设置当前音量大小
                this.$refs.audio.volume = this.volumeProgress / 100;
            }
        },
        // 显示播放列表
        showPlayList() {
            /**
             * 功能同showSearchList函数类似，由于涉及的变量太多故设计共用函数没有什么必要
             */
            if(this.selectSearch) {
                this.scrolling = true;
                this.selectSearch = false;
                this.keywords = this.playKeyWords;
                this.songs = deepCopy(this.playMusicObjectList);
                this.musicIds = deepCopy(this.playMusicIdList);
                let musicItemsScroll = this.$refs.musicItemsScroll;
                window.sessionStorage.setItem("searchScrollPosition", musicItemsScroll.scrollTop.toString());
                setTimeout(() => {
                    musicItemsScroll.scrollTop = parseInt(window.sessionStorage.getItem('playScrollPosition'));
                    this.scrolling = false;
                }, 0);
            }
        },
        // 显示搜索列表
        showSearchList() {
            /**
             * 点击搜索列表调用该事件处理函数，实例中存在四个歌曲列表，分别为显示列表、播放列表、搜索列表
             * 以及搜索框结果集列表，三者的关系：通过在搜索框输入查询关键字，会动态实时进行查询
             * 此时查询的结果会存放在搜索框结果集列表中，如果按下回车或点击搜索图标进行查询，那
             * 么会将搜索框结果集列表深拷贝给搜索列表，如果点击了搜索框结果集列表中的音乐，那么
             * 会将搜索框结果集列表深拷贝给播放列表，如果点击了搜索列表中显示的音乐，那么会将搜
             * 索列表深拷贝给播放列表。而显示列表则为播放列表和搜索列表渲染音乐真正依赖的数据
             */
            if(!this.selectSearch) {
                // 阻止滑动条触底事件，假设当前显示的为播放列表，此时点击搜索列表，如果此时
                // 播放列表的滑动条处于接近底部的位置并且搜索列表对应的滑动条的长度比播放列
                // 表对应的要长，那么在切换的时候滑动条变长就会出现触底的可能，此时会发生数
                // 据的而外请求，前后数据的一致性也呗破环了，此时需要进行避免，因为在触底事
                // 件处理函数中对运行函数功能之前有一个判断操作，通过scrolling属性的值判
                // 断当前是否正在处理触底事件，如果正在处理，那么将会拒绝期间的所有触底事件，
                // 避免一次触底而引发多次事件，因为数据请求存在时间，如果此期间滑动条持续停
                // 在底部，那么可能触发多次处理函数，所以一旦触发了一次触底事件，在事件处理
                // 完成之前不允许重复触发。在切换时可以将scrolling的值设为真，即表示此时
                // 正在进行触底事件，这样切换时就不会触发触底事件
                this.scrolling = true;
                this.selectSearch = true;   // 将搜索列表高亮显示
                // 将当前查询关键字切换为搜索列表对应的查询关键字，如果在该列表发生
                // 滑动条触底事件，则使用搜索列表对应的音乐查询关键字进行数据请求，
                // 以免出现数据混乱的情况
                this.keywords = this.searchKeyWords;
                this.songs = deepCopy(this.searchMusicObjectList);
                this.musicIds = deepCopy(this.searchMusicIdList);
                let musicItemsScroll = this.$refs.musicItemsScroll;
                // 保存当前列表滑动条的位置
                window.sessionStorage.setItem("playScrollPosition", musicItemsScroll.scrollTop.toString());
                // 在浏览器缓存中取出目标列表的滑动条位置并对滑动条的位置进行修改
                setTimeout(() => {
                    musicItemsScroll.scrollTop = parseInt(window.sessionStorage.getItem('searchScrollPosition'));
                    this.scrolling = false;
                }, 0);
            }
        },
        inputBlur() {
            /**
             * 此处必须设置一定的延时，因为输入框失焦事件发生在点击事件之前，如果不对
             * 失焦进行一定的延时处理，那么在输入框失焦后搜索结果集会随着focused
             * 属性值为假而隐藏，此时搜索结果集中的点击事件便不会继续发生，也就不会
             * 播放所点击的音乐
             */
            this.blured = setTimeout(res => {
                this.focused = false;
            }, 10)
        },
        // 点击歌词切换进度
        clickWords(e) {
            /**
             * 点击歌词时调用该事件处理函数，首先无论此时音乐处于播放状态还是暂停状态，一律
             * 重设为播放状态，并且触发播放控制器动画，根据目标歌词段的索引计算出该段歌词的
             * 播放时间点，以此计算出各类相关属性将要跳转到的状态
             */
            // 点击歌词触发音乐播放
            this.play();
            // 触发播放控制器动画
            playControlAnimation.apply(this, [true]);
            // 1、获取用户点击的歌词在歌词列表的索引
            let index = e.target.getAttribute('index');
            // 2、将点击的歌词显示在可视区域中间
            this.$refs.musicWordsWrap.scrollTop = 50 * index
            // 3、修改当前播放歌词的索引
            this.wordsIndex = index;
            // 4、根据该索引在歌词列表中获取该段歌词播放的时间
            let currentTime = this.musicWords[index]['time'];
            // 5、根据步骤二求出的时间与总时间按比例换算求出进度条的位置并更新
            this.musicProgress = currentTime / this.duration * parseInt(getComputedStyle(this.$refs.percent)['width']);
            // 6、修改当前播放时间
            this.currentTime = formatDate(currentTime);
            // 7、修改歌曲的播放进度
            this.$refs.audio.currentTime = currentTime;
        },
        mouseOverControl(e) {
            /**
             * 当鼠标移入播放控制器时调用改事件处理函数，因为在移入的时候可能控制器正在进行上一段
             * 移入动画（鼠标反复移进移出），这样会影响动画效果，所以在进行动画之前无论上一段动画
             * 是否已经完成都将它清除（清除定时器即可）
             */
            clearInterval(this.controlTimer);
            animation(e.target, 0);
        },
        mouseleaveControl(e) {
            /**
             * 在鼠标移出播放控制器时，控制器会在3秒的延迟后通过动画进行隐藏
             */
            this.controlTimer = setTimeout(() => {
                animation(e.target, -50);
            }, 3000)
        }
    },
})
// 格式化时间
function formatDate(time) {
    let minute = Math.floor((time / 60 % 60)) < 10 ? '0' + Math.floor((time / 60 % 60)) : Math.floor((time / 60 % 60));
    let second = Math.floor((time % 60)) < 10 ? '0' + Math.floor((time % 60)) : Math.floor((time % 60));
    return `${minute}:${second}`
}
// 深拷贝
function deepCopy(arr) {
    let temp = JSON.stringify(arr);
    return JSON.parse(temp);
}
function getMusicObj(data) {
    let musicId = data.id;
    let musicName = data.name;
    let artists = data.artists
    let artistsName = "";
    for (let artist of artists) {
        artistsName += artist.name + " ";
    }
    artistsName = artistsName.substr(0, artistsName.length - 1);
    return [{musicId, musicName, artistsName}, musicId]
}
function getMusicWords(musicId) {
    let parseWordsResult = [];
    axios.get(`https://autumnfish.cn//lyric?id=${musicId}`)
        .then(res => {
            let lyric = res.data['lrc']['lyric'];
            let wordLines = lyric.split('\n');
            for (let i = 0; i < wordLines.length; i++) {
                let temp = wordLines[i].split(']');
                let words = strip(temp[1])
                let time = temp[0].split('[')[1];
                if (words) {
                    // 将时间格式化为以秒为单位的时间
                    let [minute, second] = time.split(':');
                    parseWordsResult.push({'time': 60 * parseFloat(minute) + parseFloat(second), 'words': strip(temp[1])});
                }
            }
        })
    return parseWordsResult;
}
function strip(str){
    return str ? str.replace(/(^\s*)|(\s*$)/g,"") : str;
}
function circleAdjustMusicProgressAndMusicWords() {
    this.timeInterval = setInterval(() => {
        // 1、获取当前音乐播放的时长
        let currentTime = this.$refs.audio.currentTime;
        if (this.wordsIndex < this.musicWords.length && currentTime >= this.musicWords[this.wordsIndex]['time']) {
            this.wordsIndex++;
            this.$refs.musicWordsWrap.scrollTop += 50;
        }
        // 2、获取当前播放音乐的总时长
        let duration = this.$refs.audio.duration;
        // 3、更新实例数据
        this.currentTime = formatDate(currentTime);
        this.duration = formatDate(duration);
        // 4、修改播放进度条的进度
        this.musicProgress = parseInt(getComputedStyle(this.$refs.percent)['width']) * currentTime / duration;
    }, 0)
}
function animation(obj, target) {
    clearInterval(obj.timer);
    obj.timer = setInterval(() => {
        let marginBottom = parseInt(obj.style.marginBottom);
        let speed = (target - marginBottom) / 20;
        speed = speed > 0 ? Math.ceil(speed) : Math.floor(speed);
        if (marginBottom === target) {
            clearInterval(obj.timer);
        } else {
            obj.style.marginBottom = marginBottom + speed + 'px';
        }
    }, 30)
}
// 音乐播放控制器动画
function playControlAnimation(hideControl) {
    this.mouseOverControl({target: this.$refs.playControl});
    if (hideControl) {
        this.mouseleaveControl({target: this.$refs.playControl})
    }
}
