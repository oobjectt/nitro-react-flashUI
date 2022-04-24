import { HabboSearchComposer, HabboSearchResultData, HabboSearchResultEvent } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, OpenMessengerChat, SendMessageComposer } from '../../../../api';
import { Base, Column, Flex, NitroCardAccordionItemView, NitroCardAccordionSetView, NitroCardAccordionSetViewProps, Text, UserProfileIconView } from '../../../../common';
import { useFriends, UseMessageEventHook } from '../../../../hooks';

interface FriendsSearchViewProps extends NitroCardAccordionSetViewProps
{

}

export const FriendsSearchView: FC<FriendsSearchViewProps> = props =>
{
    const { ...rest } = props;
    const [ searchValue, setSearchValue ] = useState('');
    const [ friendResults, setFriendResults ] = useState<HabboSearchResultData[]>(null);
    const [ otherResults, setOtherResults ] = useState<HabboSearchResultData[]>(null);
    const { canRequestFriend = null, requestFriend = null } = useFriends();

    const onHabboSearchResultEvent = useCallback((event: HabboSearchResultEvent) =>
    {
        const parser = event.getParser();

        setFriendResults(parser.friends);
        setOtherResults(parser.others);
    }, []);

    UseMessageEventHook(HabboSearchResultEvent, onHabboSearchResultEvent);

    useEffect(() =>
    {
        if(!searchValue || !searchValue.length) return;

        const timeout = setTimeout(() =>
        {
            if(!searchValue || !searchValue.length) return;

            SendMessageComposer(new HabboSearchComposer(searchValue));
        }, 500);

        return () => clearTimeout(timeout);
    }, [ searchValue ]);

    return (
        <NitroCardAccordionSetView { ...rest }>
            <Column className="h-100">
                <Column>
                    <input type="text" className="w-100 friend-search" placeholder={ LocalizeText('generic.search') } value={ searchValue } maxLength={ 50 } onChange={ event => setSearchValue(event.target.value) } />
                </Column>
            <Column>
                { friendResults &&
                    <>
                        { (friendResults.length === 0) &&
                            <Text gfbold className="px-2 py-1">{ LocalizeText('friendlist.search.nofriendsfound') }</Text> }
                        { (friendResults.length > 0) &&
                            <Column gap={ 0 }>
                                <Text gfbold className="px-2 py-1">{ LocalizeText('friendlist.search.friendscaption', [ 'cnt' ], [ friendResults.length.toString() ]) }</Text>
                                <hr className="mx-2 mt-0 mb-1 text-black" />
                                <Column gap={ 0 }>
                                    { friendResults.map(result =>
                                    {
                                        return (
                                            <NitroCardAccordionItemView key={ result.avatarId } justifyContent="between" className="px-2 py-1">
                                                <Flex alignItems="center" gap={ 1 }>
                                                    <UserProfileIconView userId={ result.avatarId } />
                                                    <div>{ result.avatarName }</div>
                                                </Flex>
                                                <Flex alignItems="center" gap={ 1 }>
                                                    { result.isAvatarOnline &&
                                                    <Base className="nitro-friends-spritesheet icon-chat cursor-pointer" onClick={ event => OpenMessengerChat(result.avatarId) } title={ LocalizeText('friendlist.tip.im') } /> }
                                                </Flex>
                                            </NitroCardAccordionItemView>
                                        )
                                    }) }
                                </Column>
                            </Column> }
                    </> }
                { otherResults &&
                    <>
                        { (otherResults.length === 0) &&
                            <Text gfbold className="px-2 py-1">{ LocalizeText('friendlist.search.noothersfound') }</Text> }
                        { (otherResults.length > 0) &&
                            <Column gap={ 0 }>
                                <Text gfbold className="px-2 py-1">{ LocalizeText('friendlist.search.otherscaption', [ 'cnt' ], [ otherResults.length.toString() ]) }</Text>
                                <hr className="mx-2 mt-0 mb-1 text-black" />
                                <Column gap={ 0 }>
                                    { otherResults.map(result =>
                                    {
                                        return (
                                            <NitroCardAccordionItemView key={ result.avatarId } justifyContent="between" className="px-2 py-1">
                                                <Flex alignItems="center" gap={ 1 }>
                                                    <UserProfileIconView userId={ result.avatarId } />
                                                    <div>{ result.avatarName }</div>
                                                </Flex>
                                                <Flex alignItems="center" gap={ 1 }>
                                                    { canRequestFriend(result.avatarId) &&
                                                    <Base className="nitro-friends-spritesheet icon-add cursor-pointer" onClick={ event => requestFriend(result.avatarId, result.avatarName) } title={ LocalizeText('friendlist.tip.addfriend') } /> }
                                                </Flex>
                                            </NitroCardAccordionItemView>
                                        )
                                    }) }
                                </Column>
                            </Column> }
                    </> }
            </Column>
            </Column>
        </NitroCardAccordionSetView>
    );
}
