/**
 * 删除好友
 */

(() => {
    /**
     * 控件id
     */
    let ids;
    /**
     * 控件文本
     */
    let texts;
    let node_util;
    let db_util;
    /**
     * 好友备注
     */
    let last_friend_remark;
    /**
     * 好友的微信号
     */
    let last_we_chat_id;
    /**
     * 上一次点击的可见好友的位置
     */
    let last_index;
    /**
     * 执行步骤
     */
    let step;
    /**
     * 运行状态
     */
    let run;
    /**
     * 悬浮窗
     */
    let window;
    let language;

    /**
     * 点击通讯录
     */
    function clickContacts() {
        let nodes = id(ids["contacts_id"]).untilFind();
        for (let i = 0; i < nodes.size(); i++) {
            let node = nodes.get(i);
            if (texts["contacts_text"].match(node.text()) != null && node_util.backtrackClickNode(node)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 滚动好友列表
     */
    function scrollFriendList() {
        if (id(ids["friend_list_id"]).findOne().scrollForward()) {
            last_we_chat_id = "";
            last_friend_remark = "";
            last_index = -1;
            sleep(800);
        }
    }

    /**
     * 点击好友
     */
    function clickFriend() {
        let friends_remark = id(ids["friend_remark_id"]).untilFind();
        let index = 0;
        for (let i = 0; i < friends_remark.size(); i++) {
            if (db_util.hasSelectedFriendByFriendRemark(friends_remark.get(i).text())) {
                index = i;
                break;
            }
        }
        // 跳过连续可见的相同昵称的好友
        while (index <= last_index) {
            index++;
        }
        if (index >= friends_remark.size() || !db_util.hasSelectedFriendByFriendRemark(friends_remark.get(index).text())) {
            if (id(ids["contacts_count_id"]).find().empty()) {
                scrollFriendList();
            } else {
                stopScript();
            }
        } else {
            let friend_remark = friends_remark.get(index);
            if (node_util.backtrackClickNode(friend_remark)) {
                last_friend_remark = friend_remark.text();
                step = 1;
                last_index = index;
            }
        }
    }

    /**
    * 检查微信号是否相同
    */
    function checkWeChatId() {
        let we_chat_id = id(ids["we_chat_id"]).findOne().text();
        if (db_util.hasSelectedFriendByWeChatID(we_chat_id)) {
            last_we_chat_id = we_chat_id;
            step = 2;
        } else {
            if (node_util.backtrackClickNode(id(ids["back_to_friend_list_id"]).findOne())) {
                step = 0;
            }
        }
    }

    /**
     * 点击更多功能
     */
    function clickMoreFunction() {
        if (node_util.backtrackClickNode(id(ids["more_function_by_delete_id"]).findOne())) {
            step = 3;
        }
    }

    /**
     * 点击删除功能
     */
    function clickDeleteFunction() {
        let nodes = id(ids["delete_id"]).untilFind();
        for (let i = 0; i < nodes.size(); i++) {
            let node = nodes.get(i);
            if (texts["delete_text"].match(node.text()) != null && node_util.backtrackClickNode(node)) {
                step = 4;
                break;
            }
        }
    }

    /**
     * 点击确认删除
     */
    function clickConfirmDelete() {
        if (node_util.backtrackClickNode(id(ids["confirm_delete_id"]).findOne())) {
            db_util.modifyFriend({we_chat_id: last_we_chat_id, selected: true, deleted: true});
            step = 5;
            last_index--;
            ui.run(() => {
                window.deleted_text.setText(window.deleted_text.text() + last_friend_remark + " " + last_we_chat_id + "\n");
                window.deleted_text_scroll.scrollTo(0, window.deleted_text.getHeight());
            });
        }
    }

    /**
     * 监听音量下键按下，停止脚本运行
     */
    function keyDownListenerByVolumeDown() {
        threads.start(function () {
            // 启用按键监听
            events.observeKey();
            events.setKeyInterceptionEnabled("volume_down", true);
            // 监听音量上键按下
            events.onceKeyDown("volume_down", function () {
                stopScript();
            });
        });
    }

    /**
     * 停止脚本运行
     */
    function stopScript() {
        run = false;
        events.setKeyInterceptionEnabled("volume_down", false);
        events.removeAllKeyDownListeners("volume_down");
        window.close();
        toast(language["script_stopped"]);
        engines.myEngine().forceStop();
        engines.execScriptFile("main.js");
    }

    function main() {
        config = JSON.parse(files.read("config/config.json"));
        if (launch(config["we_chat_package_name"])) {
            texts = JSON.parse(files.read("config/text_id/text.json"));
            node_util = require("utils/node_util.js");

            let app_util = require("utils/app_util.js");
            let min_supported_version, max_supported_version;
            let we_chat_version = app_util.getAppVersion(config["we_chat_package_name"]);
            for (let i = 0; i < config["supported_version"].length; i++) {
                if (app_util.supported(we_chat_version, config["supported_version"][i]["min_supported_version"], config["supported_version"][i]["max_supported_version"])) {
                    min_supported_version = config["supported_version"][i]["min_supported_version"];
                    max_supported_version = config["supported_version"][i]["max_supported_version"];
                    break;
                }
            }
            ids = JSON.parse(files.read("config/text_id/" + min_supported_version + "-" + max_supported_version + ".json"));
            
            last_we_chat_id = "", last_friend_remark = "", last_index = -1, step = 0, run = true;
            keyDownListenerByVolumeDown();
            
            // 获取系统语言
            let default_language = "zh-CN";
            let local_language = context.resources.configuration.locale.language + "-" + context.resources.configuration.locale.country;
            for (let i = 0; i < config["supported_language"].length; i++) {
                if (config["supported_language"][i] == local_language) {
                    default_language = local_language;
                    break;
                }
            }
            language = JSON.parse(files.read("config/languages/" + default_language + ".json"));

            window = floaty.window(
                <frame>
                    <vertical padding="8" bg="#000000" w="*">
                        <vertical layout_weight="1" w="*">
                            <text textColor="red" w="*" id="deleted_friends_title"/>
                            <scroll w="*" h="60" id="deleted_text_scroll"><text textColor="red" layout_gravity="top" id="deleted_text"/></scroll>
                        </vertical>
                        <horizontal>
                            <button id="stop_button" w="*" textColor="green" style="Widget.AppCompat.Button.Colored" textStyle="bold"/>
                        </horizontal>
                    </vertical>
                </frame>
            );
            window.deleted_friends_title.setText(language["deleted_friends_title"]);
            window.stop_button.setText(language["stop"]);
            window.setAdjustEnabled(true);
            window.stop_button.on("click", () => {
                stopScript();
            });

            if (clickContacts()) {
                db_util = require("utils/db_util.js");
                let count_selected_friend = db_util.countSelectedFriend();
                for (let i = 0; i < count_selected_friend; i++) {
                    deleted:
                    while (run) {
                        switch (step) {
                            case 0:
                                clickFriend();
                                break;
                            case 1:
                                checkWeChatId();
                                break;
                            case 2:
                                clickMoreFunction();
                                break;
                            case 3:
                                clickDeleteFunction();
                                break;
                            case 4:
                                clickConfirmDelete();
                                break;
                            case 5:
                                step = 0;
                                break deleted;
                        }
                    }
                }
                stopScript();
            }
        }
    }

    main();
})();
