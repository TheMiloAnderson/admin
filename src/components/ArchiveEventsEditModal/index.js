import React from 'react';
import { connect } from 'react-redux';
import { Modal } from 'antd';
import ArchiveEditForm from './forms';
import selectionStateBranch from '../../state/selections';

class ArchiveEventsEditModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    }
  }

  componentDidMount() {
    const {
      clearTempAddress,
    } = this.props;
    clearTempAddress();
  }

  render() {
    const {
      visible,
      handleClose,
      townHall,
      tempAddress,
      setTempAddress,
      clearTempAddress,
      updateEvent,
      setTimeZone,
    } = this.props;
    return (
      <Modal
        title="Edit Address or Date"
        visible={visible}
        onCancel={handleClose}
        footer={null}
        closable
      >
        <ArchiveEditForm
          townHall={townHall}
          tempAddress={tempAddress}
          setTempAddress={setTempAddress}
          clearTempAddress={clearTempAddress}
          setTimeZone={setTimeZone}
          updateEvent={updateEvent}
          handleClose={handleClose}
        />
      </Modal>
    )
  }
}

const mapStateToProps = state => ({
  pathForEvents: selectionStateBranch.selectors.getEventsToShowUrl(state),
  tempAddress: selectionStateBranch.selectors.getTempAddress(state),
});

const mapDispatchToProps = dispatch => ({
  setTempAddress: (address) => dispatch(selectionStateBranch.actions.setTempAddress(address)),
  clearTempAddress: () => dispatch(selectionStateBranch.actions.clearTempAddress()),
  setTimeZone: (payload) => dispatch(selectionStateBranch.actions.getArchivedTimeZone(payload)),
  setTempAddress: (address) => dispatch(selectionStateBranch.actions.setTempAddress(address)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ArchiveEventsEditModal);