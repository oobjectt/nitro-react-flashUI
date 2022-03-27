import { GetGuestRoomResultEvent, NitroPoint, RoomChatSettings, RoomChatSettingsEvent, RoomDragEvent } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { GetConfiguration, RoomChatFormatter, RoomWidgetChatSelectAvatarMessage, RoomWidgetRoomObjectMessage, RoomWidgetUpdateChatEvent } from '../../../../api';
import { UseEventDispatcherHook, UseMessageEventHook, UseRoomEngineEvent } from '../../../../hooks';
import { useRoomContext } from '../../RoomContext';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';
import { ChatBubbleMessage } from './common/ChatBubbleMessage';
import { DoChatsOverlap } from './common/DoChatsOverlap';

export const ChatWidgetView: FC<{}> = props =>
{
    const [chatSettings, setChatSettings] = useState<RoomChatSettings>(null);
    const [ chatMessages, setChatMessages ] = useState<ChatBubbleMessage[]>([]);
    const { roomSession = null, eventDispatcher = null, widgetHandler = null } = useRoomContext();
    const elementRef = useRef<HTMLDivElement>();

    const removeHiddenChats = useCallback(() =>
    {
        if(!chatMessages.length) return;

        const newMessages = chatMessages.filter(chat => ((chat.top > (-(chat.height) * 2))));

        if(newMessages.length !== chatMessages.length) setChatMessages(newMessages);
    }, [ chatMessages ]);

    const moveAllChatsUp = useCallback((amount: number) =>
    {
        chatMessages.forEach(chat => (chat.top -= amount));

        removeHiddenChats();
    }, [ chatMessages, removeHiddenChats ]);

    const checkOverlappingChats = useCallback((chat: ChatBubbleMessage, moved: number, tempChats: ChatBubbleMessage[]) => 
    {
        const totalChats = chatMessages.length;

        if(!totalChats) return;

        for(let i = (totalChats - 1); i >= 0; i--)
        {
            const collides = chatMessages[i];

            if(!collides || (chat === collides) || (tempChats.indexOf(collides) >= 0) || ((collides.top - moved) >= (chat.top + chat.height))) continue;

            if(DoChatsOverlap(chat, collides, -moved))
            {
                const amount = Math.abs((collides.top + collides.height) - chat.top);

                tempChats.push(collides);

                collides.top -= amount;

                checkOverlappingChats(collides, amount, tempChats);
            }
        }
    }, [ chatMessages ]);

    const makeRoom = useCallback((chat: ChatBubbleMessage) =>
    {
        if(chatSettings.mode === RoomChatSettings.CHAT_MODE_FREE_FLOW)
        {
            checkOverlappingChats(chat, 0, [ chat ]);

            removeHiddenChats();
        }
        else
        {
            const lowestPoint = (chat.top + chat.height);
            const requiredSpace = chat.height;
            const spaceAvailable = (elementRef.current.offsetHeight - lowestPoint);
            const amount = (requiredSpace - spaceAvailable);

            if(spaceAvailable < requiredSpace)
            {
                chatMessages.forEach(existingChat =>
                {
                    if(existingChat === chat) return;

                    existingChat.top -= amount;
                });

                removeHiddenChats();
            }
        }
    }, [ chatSettings, chatMessages, removeHiddenChats, checkOverlappingChats ]);

    const onRoomWidgetUpdateChatEvent = useCallback((event: RoomWidgetUpdateChatEvent) =>
    {
        const chatMessage = new ChatBubbleMessage(
            event.userId,
            event.userCategory,
            event.roomId,
            event.text,
            RoomChatFormatter(event.text),
            event.userName,
            new NitroPoint(event.userX, event.userY),
            event.chatType,
            event.styleId,
            event.userImage,
            (event.userColor && (('#' + (event.userColor.toString(16).padStart(6, '0'))) || null)));

        setChatMessages(prevValue => [ ...prevValue, chatMessage ]);
    }, []);

    UseEventDispatcherHook(RoomWidgetUpdateChatEvent.CHAT_EVENT, eventDispatcher, onRoomWidgetUpdateChatEvent);

    const onRoomDragEvent = useCallback((event: RoomDragEvent) =>
    {
        if(!chatMessages.length || (event.roomId !== roomSession.roomId)) return;

        chatMessages.forEach(chat => (chat.elementRef && (chat.left += event.offsetX)));
    }, [ roomSession, chatMessages ]);

    UseRoomEngineEvent(RoomDragEvent.ROOM_DRAG, onRoomDragEvent);

    const onChatClicked = useCallback((chat: ChatBubbleMessage) =>
    {
        widgetHandler.processWidgetMessage(new RoomWidgetRoomObjectMessage(RoomWidgetRoomObjectMessage.GET_OBJECT_INFO, chat.senderId, chat.senderCategory));
        widgetHandler.processWidgetMessage(new RoomWidgetChatSelectAvatarMessage(RoomWidgetChatSelectAvatarMessage.MESSAGE_SELECT_AVATAR, chat.senderId, chat.username, chat.roomId));
    }, [ widgetHandler ]);

    const getScrollSpeed = useCallback(() =>
    {
        if(!chatSettings) return 6000;

        switch(chatSettings.speed)
        {
            case RoomChatSettings.CHAT_SCROLL_SPEED_FAST:
                return 3000;
            case RoomChatSettings.CHAT_SCROLL_SPEED_NORMAL:
                return 6000;
            case RoomChatSettings.CHAT_SCROLL_SPEED_SLOW:
                return 12000;
        }
    }, [ chatSettings ])

    const onGetGuestRoomResultEvent = useCallback((event: GetGuestRoomResultEvent) =>
    {
        const parser = event.getParser();

        if(!parser.roomEnter) return;
        
        setChatSettings(parser.chat);
    }, []);

    UseMessageEventHook(GetGuestRoomResultEvent, onGetGuestRoomResultEvent);

    const onRoomChatSettingsEvent = useCallback((event: RoomChatSettingsEvent) =>
    {
        const parser = event.getParser();
        
        setChatSettings(parser.chat);
    }, []);

    UseMessageEventHook(RoomChatSettingsEvent, onRoomChatSettingsEvent);

    useEffect(() =>
    {
        const interval = setInterval(() => moveAllChatsUp(15), getScrollSpeed());

        return () =>
        {
            if(interval) clearInterval(interval);
        }
    }, [ chatMessages, moveAllChatsUp, getScrollSpeed ]);

    useEffect(() =>
    {
        if(!elementRef || !elementRef.current) return;

        elementRef.current.style.height = ((document.body.offsetHeight * GetConfiguration<number>('chat.viewer.height.percentage')) + 'px');
    }, []);

    return (
        <div ref={ elementRef } className="nitro-chat-widget">
            {chatMessages.map(chat => <ChatWidgetMessageView key={chat.id} chat={chat} makeRoom={makeRoom} onChatClicked={onChatClicked} bubbleWidth={ chatSettings.weight }/>)}
        </div>
    );
}
