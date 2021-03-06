import { MutationUpdaterFn } from "apollo-boost";
import PropTypes from "prop-types";
import React from "react";
import { compose, graphql, Mutation, MutationFn } from "react-apollo";
import { toast } from "react-toastify";
import { LOG_USER_IN } from "../../sharedQueries";
import LoginPresenter from "./LoginPresenter";
import { FACEBOOK_CONNECT, REQUEST_PHONE_SIGNIN } from "./LoginQueries";
import { loginMethodType } from "./LoginTypes";

interface IState {
  phoneNumber: string;
  countryCode: string;
  loginMethod: loginMethodType;
}

interface IProps {
  logUserIn: MutationFn;
  facebookConnectMutation: MutationFn;
  history: any;
}

class LoginContainer extends React.Component<IProps, IState> {
  static propTypes = {
    facebookConnectMutation: PropTypes.func.isRequired
  };
  constructor(props: any) {
    super(props);
    this.state = {
      countryCode: "+82",
      loginMethod: "",
      phoneNumber: ""
    };
  }
  render() {
    const { phoneNumber, loginMethod, countryCode } = this.state;
    return (
      <Mutation mutation={REQUEST_PHONE_SIGNIN} update={this.handleAfterSubmit}>
        {(phoneSignIn, { loading }) => (
          <LoginPresenter
            handleMobileClick={this.handleMobileClick}
            handleSocialClick={this.handleSocialClick}
            handleBackButtonClick={this.handleBackButtonClick}
            phoneNumber={phoneNumber}
            loginMethod={loginMethod}
            handleInputChange={this.handleInputChange}
            countryCode={countryCode}
            handleFacebookResponse={this.handleFacebookResponse}
            loading={loading}
            // tslint:disable-next-line jsx-no-lambda
            onSubmit={event => {
              event.preventDefault();
              this.handleSubmit(phoneSignIn);
            }}
          />
        )}
      </Mutation>
    );
  }
  private handleMobileClick = (): void => {
    if (this.state.loginMethod === "") {
      this.setState({
        loginMethod: "mobile"
      });
    }
  };
  private handleSocialClick = (): void => {
    if (this.state.loginMethod === "") {
      this.setState({
        loginMethod: "social"
      });
    }
  };

  private handleInputChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLSelectElement
  > = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const {
      target: { value, name }
    } = event;
    this.setState({
      [name]: value
    } as any);
  };

  private handleBackButtonClick = (): void => {
    this.setState({
      loginMethod: ""
    });
  };

  private handleAfterSubmit: MutationUpdaterFn = (
    cache,
    { data }: { data: any }
  ): void => {
    const { phoneNumber, countryCode } = this.state;
    const { history } = this.props;
    const { requestPhoneSignIn } = data;
    if (requestPhoneSignIn.ok) {
      toast.success("SMS Sent.");
      setTimeout(
        () =>
          history.push({
            pathname: "/verify-phone",
            state: {
              phone: `${countryCode}${phoneNumber}`
            }
          }),
        4000
      );
    } else if (requestPhoneSignIn.error) {
      toast.error(requestPhoneSignIn.error);
    }
  };

  private handleSubmit = (mutationFn: MutationFn): void => {
    const { phoneNumber, countryCode } = this.state;
    const isValid = /^\+[1-9]{1}[0-9]{7,11}$/.test(
      `${countryCode}${phoneNumber}`
    );
    if (isValid) {
      mutationFn({
        variables: {
          phoneNumber: `${countryCode}${phoneNumber}`
        }
      });
    } else {
      toast.error("Phone number is not valid");
    }
  };

  private handleFacebookResponse = async (response: any): Promise<void> => {
    const { facebookConnectMutation, logUserIn } = this.props;
    if (response.accessToken) {
      facebookConnectMutation({
        variables: {
          email: response.email ? response.email : null,
          firstName: response.first_name,
          lastName: response.last_name,
          userID: response.userID
        },
        update: (cache, { data: { facebookConnect } }) => {
          if (facebookConnect.ok) {
            logUserIn({ variables: { token: facebookConnect.token } });
          } else {
            toast.error("Couldn't log in with Facebook, try again");
          }
        }
      });
    }
  };
}

export default compose(
  graphql<any, any>(FACEBOOK_CONNECT, {
    name: "facebookConnectMutation"
  }),
  graphql<any, any>(LOG_USER_IN, {
    name: "logUserIn"
  })
)(LoginContainer);
