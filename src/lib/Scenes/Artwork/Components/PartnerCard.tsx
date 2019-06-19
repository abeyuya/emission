import { Box, EntityHeader, Flex } from "@artsy/palette"
import { PartnerCard_artwork } from "__generated__/PartnerCard_artwork.graphql"
import { PartnerCardFollowMutation } from "__generated__/PartnerCardFollowMutation.graphql"
import InvertedButton from "lib/Components/Buttons/InvertedButton"
import SwitchBoard from "lib/NativeModules/SwitchBoard"
import { filterLocations } from "lib/utils/filterLocations"
import { get } from "lib/utils/get"
import { limitWithCount } from "lib/utils/limitWithCount"
import React from "react"
import { TouchableWithoutFeedback } from "react-native"
import { commitMutation, createFragmentContainer, graphql, RelayProp } from "react-relay"

interface Props {
  artwork: PartnerCard_artwork
  relay: RelayProp
}

interface State {
  isFollowedChanging: boolean
}

export class PartnerCard extends React.Component<Props, State> {
  state = { isFollowedChanging: false }
  handleFollowPartner = () => {
    const { artwork, relay } = this.props
    const {
      gravityID: partnerSlug,
      profile: { is_followed: partnerFollowed, internalID: profileID },
    } = artwork.partner

    this.setState(
      {
        isFollowedChanging: true,
      },
      () => {
        commitMutation<PartnerCardFollowMutation>(relay.environment, {
          onCompleted: () => this.handleShowSuccessfullyUpdated(),
          onError: e => console.log("errors", e),
          mutation: graphql`
            mutation PartnerCardFollowMutation($input: FollowProfileInput!) {
              followProfile(input: $input) {
                profile {
                  id
                  gravityID
                  internalID
                  is_followed
                }
              }
            }
          `,
          variables: {
            input: {
              profile_id: profileID,
              unfollow: partnerFollowed,
            },
          },
          optimisticResponse: {
            followProfile: {
              profile: {
                id: artwork.partner.profile.id,
                internalID: profileID,
                gravityID: partnerSlug,
                is_followed: !partnerFollowed,
              },
            },
          },
        })
      }
    )
  }

  handleTap(href: string) {
    SwitchBoard.presentNavigationViewController(this, href)
  }

  handleShowSuccessfullyUpdated() {
    this.setState({
      isFollowedChanging: false,
    })
  }

  render() {
    const { artwork } = this.props
    const partner = artwork.partner
    const galleryOrBenefitAuction = artwork.sale && (artwork.sale.isBenefit || artwork.sale.isGalleryAuction)
    if (partner.type === "Auction House" || galleryOrBenefitAuction) {
      return null
    }
    const { isFollowedChanging } = this.state
    const imageUrl = partner.profile ? partner.profile.icon.url : null
    const locationNames = get(partner, p => limitWithCount(filterLocations(p.locations), 2), []).join(", ")

    return (
      <Flex>
        <TouchableWithoutFeedback onPress={this.handleTap.bind(this, partner.href)}>
          <EntityHeader
            name={partner.name}
            href={partner.is_default_profile_public && partner.href}
            meta={locationNames}
            imageUrl={imageUrl}
            initials={partner.initials}
            FollowButton={
              partner.profile && (
                <Box width={90} height={30}>
                  <InvertedButton
                    grayBorder={true}
                    text={partner.profile.is_followed ? "Following" : "Follow"}
                    onPress={this.handleFollowPartner.bind(this)}
                    selected={partner.profile.is_followed}
                    inProgress={isFollowedChanging}
                  />
                </Box>
              )
            }
          />
        </TouchableWithoutFeedback>
      </Flex>
    )
  }
}

export const PartnerCardFragmentContainer = createFragmentContainer(PartnerCard, {
  artwork: graphql`
    fragment PartnerCard_artwork on Artwork {
      sale {
        isBenefit
        isGalleryAuction
      }
      partner {
        is_default_profile_public
        type
        name
        gravityID
        internalID
        id
        href
        initials
        profile {
          id
          internalID
          gravityID
          is_followed
          icon {
            url(version: "square140")
          }
        }
        locations {
          city
        }
      }
    }
  `,
})