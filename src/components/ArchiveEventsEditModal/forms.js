import React from 'react';
import {
  Button,
  Form,
  Row,
  Col,
} from 'antd';
import ArchiveLocationForm from './LocationForm';
import ArchiveDateTimeForm from './DateTimeForm';

class ArchiveAddressDateEditForm extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.checkData = this.checkData.bind(this);
  }

  handleSubmit(e) {
    const {
      townHall,
      updateEvent,
      tempAddress,
      handleClose,
    } = this.props;
    e.preventDefault();
    if (tempAddress.address) {
      console.log('still have address')
      return;
    }
    this.props.form.validateFieldsAndScroll((err, vals) => {
      if (!err) {
        const updateObj = {};
        if (vals.location) {
          updateObj.location = vals.location;
        }
        if (vals.address) {
          updateObj.address = vals.address;
        }
        if (vals.hasOwnProperty('phoneNumber')) {
          updateObj.phoneNumber = vals.phoneNumber;
        }
        updateEvent(updateObj, townHall.eventId);
        this.checkData(vals);
        handleClose();
      }
    });
  }

  checkData(vals) {
    const {
      tempAddress,
      setTimeZone,
      townHall,
    } = this.props;
    if (tempAddress.address) {
      console.log('still have address')
      return;
    }
    this.setState({
      loading: false,
    });
    const date = vals.date.format('YYYY-MM-DD');
    const startTime = vals.time.format('HH:mm:ss');
    const endTime = vals.endTime.format('HH:mm:ss');
    setTimeZone({
      date: date,
      timeStart: startTime,
      timeEnd: endTime,
      lat: townHall.lat,
      lng: townHall.lng,
      eventId: townHall.eventId,
    });
  }

  render() {
    const formItemLayout = {
      labelCol: {
        sm: { span: 8 },
        xs: { span: 24 },
      },
      wrapperCol: {
        sm: { span: 16 },
        xs: { span: 24 },
      },
    };
    const {
      townHall,
      tempAddress,
      setTempAddress,
      clearTempAddress,
      updateEvent,
      handleClose,
    } = this.props;
    const {
      getFieldDecorator,
      resetFields,
    } = this.props.form;
    return (
      <Form 
        {...formItemLayout} 
        onSubmit={this.handleSubmit} 
        onKeyPress={(e) => { e.key === 'Enter' && e.preventDefault(); }}
      >
        <ArchiveDateTimeForm 
          townHall={townHall}
          getFieldDecorator={getFieldDecorator}
        />
        <ArchiveLocationForm 
          currentTownHall={townHall}
          geoCodeLocation={setTempAddress}
          tempAddress={tempAddress.address}
          tempAddressFullData={tempAddress}
          clearTempAddress={clearTempAddress}
          tempLat={tempAddress.lat}
          tempLng={tempAddress.lng}
          getFieldDecorator={getFieldDecorator}
          resetFields={resetFields}
          updateEvent={updateEvent}
        />
        <Row>
          <Col style={{ textAlign: 'right' }}>
            <Button type="primary" htmlType="submit">
              OK
            </Button>
            <Button onClick={handleClose}>
              Cancel
            </Button>
          </Col>
        </Row>
      </Form>
    )
  }
}

const WrappedArchiveAddressDateEditForm = Form.create({ 
  name: 'address-date-form'
})(ArchiveAddressDateEditForm);

export default WrappedArchiveAddressDateEditForm;